import { Loader2, Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { emptyCliente, MODULOS, valorContrato, valorBoletoCliente, valorPraticoCliente, type Cliente, type ClienteInput, type GrupoCliente } from "@/lib/clientes";
import { buscarAliasesCnpj, type ClienteAliasCnpj } from "@/lib/conciliacao-efi";
import { useClientes } from "@/lib/use-clientes";
import {
  CnpjError,
  consultarCnpj as consultarCnpjApi,
  isCnpjZerado,
  isValidCnpj,
  onlyDigits,
} from "@/lib/cnpj";
import { formatCurrency } from "@/lib/fincontrol";
import { CnpjAliasesManager } from "@/components/fincontrol/cnpj-aliases-manager";

const selectClass = "h-10 w-full rounded-md border border-input bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring";

export function ClienteDialog({ open, cliente, grupos, saving, onOpenChange, onCreateGrupo, onSave, onAbrirCliente }: {
  open: boolean;
  cliente: Cliente | null;
  grupos: GrupoCliente[];
  saving: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateGrupo: (nome: string) => Promise<GrupoCliente>;
  onSave: (values: ClienteInput, id?: string) => void;
  onAbrirCliente?: (cliente: Cliente) => void;
}) {
  const { data: clientesCadastrados = [] } = useClientes();
  const [form, setForm] = useState<ClienteInput>(emptyCliente());
  const [aliases, setAliases] = useState<ClienteAliasCnpj[]>([]);
  const [novoGrupo, setNovoGrupo] = useState("");
  const [consultandoCnpj, setConsultandoCnpj] = useState(false);
  const [tipoPessoa, setTipoPessoa] = useState<"FISICA" | "JURIDICA">("JURIDICA");
  const ultimoCnpjConsultado = useRef("");

  useEffect(() => {
    if (!open || !cliente?.id) {
      setAliases([]);
      return;
    }
    let ativo = true;
    buscarAliasesCnpj()
      .then((todos) => {
        if (!ativo) return;
        setAliases(todos.filter((a) => a.cliente_id === cliente.id));
      })
      .catch(() => {
        if (ativo) setAliases([]);
      });
    return () => {
      ativo = false;
    };
  }, [open, cliente?.id]);

  useEffect(() => {
    if (!open) return;
    if (cliente) {
      const { id: _id, created_at: _created, updated_at: _updated, deleted_at: _deleted, ...values } = cliente;
      setForm(values);
      setTipoPessoa(cliente.cnpj.replace(/\D/g, "").length === 11 ? "FISICA" : "JURIDICA");
      ultimoCnpjConsultado.current = onlyDigits(cliente.cnpj);
    } else {
      setForm(emptyCliente());
      setTipoPessoa("JURIDICA");
      ultimoCnpjConsultado.current = "";
    }
    setNovoGrupo("");
  }, [open, cliente]);

  const mensalidade = useMemo(() => valorContrato(form), [form]);

  const clientesVinculados = useMemo(() => {
    return aliases
      .map((alias) =>
        clientesCadastrados.find((c) => onlyDigits(c.cnpj || "") === onlyDigits(alias.cnpj)),
      )
      .filter((c): c is Cliente => Boolean(c));
  }, [aliases, clientesCadastrados]);

  const valorPrincipalProprio = useMemo(() => valorContrato(form), [form]);
  const valorVinculados = useMemo(
    () => clientesVinculados.reduce((total, item) => total + valorContrato(item), 0),
    [clientesVinculados],
  );
  const valorBoletoTotal = useMemo(
    () => valorPrincipalProprio + valorVinculados,
    [valorPrincipalProprio, valorVinculados],
  );
  const valorPraticoTotal = useMemo(() => {
    const manual = Number(form.valor_pratico || 0);
    if (manual > 0) return manual;
    const basePrincipal = form.plano === "COMPLETO" ? 100 : 80;
    return basePrincipal + clientesVinculados.reduce((total, item) => total + Number(item.valor_base || 0), 0);
  }, [form.valor_pratico, form.plano, clientesVinculados]);

  const update = <K extends keyof ClienteInput>(key: K, value: ClienteInput[K]) => setForm((current) => ({ ...current, [key]: value }));

  async function criarGrupo() {
    if (!novoGrupo.trim()) return;
    try {
      const grupo = await onCreateGrupo(novoGrupo);
      update("grupo_id", grupo.id);
      setNovoGrupo("");
      toast.success("Grupo criado.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível criar o grupo.");
    }
  }

  async function consultarCnpj() {
    const cnpj = onlyDigits(form.cnpj);
    // CNPJ só de zeros: placeholder aceito, preenchimento manual e sem consulta externa.
    if (isCnpjZerado(cnpj)) return;
    if (cnpj.length !== 14) {
      toast.warning("Informe um CNPJ com 14 dígitos.");
      return;
    }

    setConsultandoCnpj(true);
    try {
      const data = await consultarCnpjApi(form.cnpj);
      if (!data) return;
      ultimoCnpjConsultado.current = data.cnpj;
      setForm((current) => ({
        ...current,
        cnpj: data.cnpj,
        razao_social: data.razao_social || current.razao_social,
        nome_fantasia: data.nome_fantasia || current.nome_fantasia,
        telefone: data.telefone || current.telefone,
        email: data.email || current.email,
        endereco: data.endereco || current.endereco,
        numero_endereco: data.numero_endereco || current.numero_endereco,
        bairro: data.bairro || current.bairro,
        cep: data.cep || current.cep,
        cidade: data.cidade || current.cidade,
        uf: data.uf || current.uf,
      }));
      toast.success("Dados do CNPJ preenchidos. Confira antes de salvar.");
    } catch (error) {
      const mensagem =
        error instanceof Error ? error.message : "Não foi possível consultar esse CNPJ.";
      if (error instanceof CnpjError && error.kind === "validacao") {
        toast.warning(mensagem);
      } else {
        // Provedores indisponíveis ou CNPJ ausente: aviso suave, sem bloquear nem
        // limpar os campos — o cadastro permanece editável para preenchimento manual.
        toast.info(`${mensagem} Você pode preencher os dados manualmente.`);
      }
    } finally {
      setConsultandoCnpj(false);
    }
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    onSave({
      ...form,
      razao_social: form.razao_social.trim().toUpperCase(),
      nome_fantasia: form.nome_fantasia.trim().toUpperCase(),
      codigo_site: form.codigo_site.trim(),
      cnpj: form.cnpj.trim(),
      telefone: form.telefone.replace(/\D/g, ""),
      nome_contato: form.nome_contato?.trim() || null,
      quantidade_computadores: Math.max(1, Number(form.quantidade_computadores) || 1),
      vencimento: Math.min(31, Math.max(1, Number(form.vencimento) || 5)),
      valor_base: Math.max(0, Number(form.valor_base) || 0),
      valor_computador_adicional: Math.max(0, Number(form.valor_computador_adicional) || 0),
      valor_proprio: valorPrincipalProprio,
      valor_boleto: valorBoletoTotal,
      valor_pratico: valorPraticoTotal,
    }, cliente?.id);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[94vh] w-[95vw] max-w-5xl flex-col overflow-hidden p-0">
        <DialogHeader className="sticky top-0 z-20 border-b bg-background px-6 py-4">
          <DialogTitle>{cliente ? "Editar cliente" : "Novo cliente"}</DialogTitle>
          <DialogDescription>Plano, módulos, dados técnicos e cobrança em um só cadastro.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-4">
          <section className="space-y-3"><h3 className="text-sm font-bold">Identificação e grupo</h3><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Tipo de pessoa"><div className="grid grid-cols-2 gap-1 rounded-md border bg-muted p-1"><Button type="button" size="sm" variant={tipoPessoa === "FISICA" ? "default" : "ghost"} onClick={() => setTipoPessoa("FISICA")}>Pessoa física</Button><Button type="button" size="sm" variant={tipoPessoa === "JURIDICA" ? "default" : "ghost"} onClick={() => setTipoPessoa("JURIDICA")}>Pessoa jurídica</Button></div></Field>
            <Field label={tipoPessoa === "FISICA" ? "Nome completo *" : "Razão social *"} className="lg:col-span-2"><Input required value={form.razao_social} onChange={(e) => update("razao_social", e.target.value)} /></Field>
            {tipoPessoa === "JURIDICA" ? <Field label="Nome fantasia"><Input value={form.nome_fantasia} onChange={(e) => update("nome_fantasia", e.target.value)} /></Field> : null}
            <Field label="Cód. Site"><Input value={form.codigo_site} onChange={(e) => update("codigo_site", e.target.value)} /></Field>
            <Field label="Mensagem Sistema"><select className={selectClass} value={form.mensagem_sistema} onChange={(e) => update("mensagem_sistema", e.target.value as ClienteInput["mensagem_sistema"])}><option value="Normal">Normal</option><option value="Bloqueado">Bloqueado</option><option value="Atualização">Atualização</option><option value="Cobrança">Cobrança</option></select></Field>
            <Field label={tipoPessoa === "FISICA" ? "CPF *" : "CNPJ *"}><div className="flex gap-2"><Input required inputMode="numeric" maxLength={tipoPessoa === "FISICA" ? 14 : 18} value={form.cnpj} onChange={(e) => update("cnpj", e.target.value)} onBlur={() => { const digitos = onlyDigits(form.cnpj); if (!cliente && tipoPessoa === "JURIDICA" && !isCnpjZerado(digitos) && isValidCnpj(digitos) && digitos !== ultimoCnpjConsultado.current) void consultarCnpj(); }} />{tipoPessoa === "JURIDICA" ? <Button type="button" size="icon" variant="outline" title="Buscar dados do CNPJ" disabled={consultandoCnpj} onClick={consultarCnpj}>{consultandoCnpj ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}</Button> : null}</div></Field>
            <Field label="WhatsApp"><Input value={form.telefone} onChange={(e) => update("telefone", e.target.value)} /></Field>
            <Field label="Nome do contato"><Input placeholder="Ex: Larissa" value={form.nome_contato ?? ""} onChange={(e) => update("nome_contato", e.target.value || null)} /></Field>
            <Field label="E-mail"><Input type="email" value={form.email} onChange={(e) => update("email", e.target.value)} /></Field>
            <Field label="Endereço" className="lg:col-span-2"><Input value={form.endereco} onChange={(e) => update("endereco", e.target.value)} /></Field>
            <Field label="Número"><Input value={form.numero_endereco} onChange={(e) => update("numero_endereco", e.target.value)} /></Field>
            <Field label="Bairro"><Input value={form.bairro} onChange={(e) => update("bairro", e.target.value)} /></Field>
            <Field label="CEP"><Input value={form.cep} onChange={(e) => update("cep", e.target.value)} /></Field>
            <Field label="Cidade"><Input value={form.cidade} onChange={(e) => update("cidade", e.target.value)} /></Field>
            <Field label="UF"><Input maxLength={2} value={form.uf} onChange={(e) => update("uf", e.target.value.toUpperCase())} /></Field>
            <Field label="Grupo empresarial"><select className={selectClass} value={form.grupo_id ?? ""} onChange={(e) => update("grupo_id", e.target.value || null)}><option value="">Sem grupo</option>{grupos.map((grupo) => <option key={grupo.id} value={grupo.id}>{grupo.nome}</option>)}</select></Field>
            <Field label="Novo grupo"><div className="flex gap-2"><Input value={novoGrupo} onChange={(e) => setNovoGrupo(e.target.value)} /><Button type="button" variant="outline" onClick={criarGrupo}>Criar</Button></div></Field>
            <Field label="Status"><select className={selectClass} value={form.status} onChange={(e) => update("status", e.target.value as ClienteInput["status"])}><option value="ATIVO">ATIVO</option><option value="INATIVO">INATIVO</option></select></Field>
          </div></section>

          <section className="space-y-3 border-t pt-4"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-sm font-bold">Plano e mensalidade</h3><strong className="text-lg text-brand">{formatCurrency(mensalidade)}</strong></div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Plano"><select className={selectClass} value={form.plano} onChange={(e) => { const plano = e.target.value as ClienteInput["plano"]; setForm((current) => ({ ...current, plano, valor_base: plano === "BÁSICO" ? 80 : 100 })); }}><option value="BÁSICO">BÁSICO</option><option value="COMPLETO">COMPLETO</option></select></Field>
            <Field label="Valor base"><Input type="number" min="0" step="0.01" value={form.valor_base} onChange={(e) => update("valor_base", Number(e.target.value))} /></Field>
            <Field label="Computadores"><Input type="number" min="1" value={form.quantidade_computadores} onChange={(e) => update("quantidade_computadores", Number(e.target.value))} /></Field>
            <Field label="Valor por adicional"><Input type="number" min="0" step="0.01" value={form.valor_computador_adicional} onChange={(e) => update("valor_computador_adicional", Number(e.target.value))} /></Field>
            <Field label="Dia de vencimento mensal *"><Input required type="number" min="1" max="31" value={form.vencimento} onChange={(e) => update("vencimento", Number(e.target.value))} placeholder="Ex: 5" /></Field>
          </div>
          <label className="flex items-center gap-2 rounded-md border p-2 text-sm font-semibold">
            <Checkbox checked={Boolean(form.nao_gerar_assinatura)} onCheckedChange={(checked) => update("nao_gerar_assinatura", Boolean(checked))} />
            Não gerar assinatura / cobrança (cadastro vinculado ou isento)
          </label>
          {form.nao_gerar_assinatura ? (
            <p className="text-xs text-muted-foreground">
              Este cadastro não gera títulos/mensalidades e é excluído da receita contratada e do ticket médio.
            </p>
          ) : null}<div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{MODULOS.map((modulo) => <label key={modulo} className="flex items-center gap-2 rounded-md border p-2 text-sm font-semibold"><Checkbox checked={form.modulos.includes(modulo)} onCheckedChange={(checked) => update("modulos", checked ? [...form.modulos, modulo] : form.modulos.filter((item) => item !== modulo))} />{modulo}</label>)}</div></section>

          <section className="space-y-3 border-t pt-4"><h3 className="text-sm font-bold">Operação técnica</h3><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Nome da rede VPN"><Input value={form.rede_vpn} onChange={(e) => update("rede_vpn", e.target.value)} /></Field>
            <Field label="Último backup"><Input type="date" value={form.ultimo_backup ?? ""} onChange={(e) => update("ultimo_backup", e.target.value || null)} /></Field>
            <Field label="Versão instalada"><Input value={form.versao_instalada} onChange={(e) => update("versao_instalada", e.target.value)} placeholder="2026.09" /></Field>
            <Field label="Última atualização"><Input type="date" value={form.data_ultima_atualizacao ?? ""} onChange={(e) => update("data_ultima_atualizacao", e.target.value || null)} /></Field>
            <Field label="Certificado"><select className={selectClass} value={form.tipo_certificado} onChange={(e) => update("tipo_certificado", e.target.value as ClienteInput["tipo_certificado"])}><option value="">Não informado</option><option value="A1">A1</option><option value="A3">A3</option></select></Field>
            <Field label="Validade do certificado"><Input type="date" value={form.validade_certificado ?? ""} onChange={(e) => update("validade_certificado", e.target.value || null)} /></Field>
            <Field label="Chave Pix" className="sm:col-span-2"><Input value={form.chave_pix} onChange={(e) => update("chave_pix", e.target.value)} /></Field>
            <Field label="Observações" className="sm:col-span-2 lg:col-span-4"><Textarea rows={3} value={form.observacoes} onChange={(e) => update("observacoes", e.target.value)} /></Field>
          </div></section>
          <section className="space-y-3 border-t pt-4"><h3 className="text-sm font-bold">CNPJs vinculados (cadastro principal)</h3>{onAbrirCliente ? (
  <CnpjAliasesManager clienteId={cliente?.id ?? null} onAbrirCliente={onAbrirCliente} onAliasesChange={setAliases} />
) : (
  <CnpjAliasesManager clienteId={cliente?.id ?? null} onAliasesChange={setAliases} />
)}</section>

          <section className="space-y-3 border-t pt-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-bold">Composição da mensalidade</h3>
              <strong className="text-lg text-brand">{formatCurrency(valorBoletoTotal)}</strong>
            </div>
            <div className="space-y-2 rounded-md border bg-muted/30 p-3 text-sm">
              <div className="flex items-center justify-between">
                <span>Principal (parte própria)</span>
                <span className="font-semibold">{formatCurrency(valorPrincipalProprio)}</span>
              </div>
              {clientesVinculados.map((vinculado) => (
                <div key={vinculado.id} className="flex items-center justify-between text-muted-foreground">
                  <span>Vinculado · {vinculado.razao_social}</span>
                  <span className="font-semibold">{formatCurrency(valorContrato(vinculado))}</span>
                </div>
              ))}
              <div className="flex items-center justify-between border-t pt-2 font-bold">
                <span>Valor UpSystem (Total do Boleto)</span>
                <span className="text-brand">{formatCurrency(valorBoletoTotal)}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold text-emerald-600">Valor Prático</span>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  className="h-8 w-32 text-right"
                  value={form.valor_pratico ?? 0}
                  onChange={(e) => update("valor_pratico", Number(e.target.value))}
                  placeholder="Ex: 240,00"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Se deixado em 0, o Valor Prático é estimado pela base de repasse da matriz e dos vinculados.
              </p>
            </div>
            <p className="text-xs text-muted-foreground">
              O Valor UpSystem (boleto) soma o valor próprio do CNPJ principal com todos os CNPJs vinculados.
              O Valor Prático é o valor considerado/repassado para o sistema Prático, independente da margem cobrada no boleto.
            </p>
          </section>
          </div>
          <DialogFooter className="sticky bottom-0 z-20 border-t bg-background px-6 py-4">
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={saving}>{saving ? "Salvando..." : "Salvar cliente"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, className = "", children }: { label: string; className?: string; children: React.ReactNode }) {
  return <div className={`space-y-1.5 ${className}`}><Label>{label}</Label>{children}</div>;
}
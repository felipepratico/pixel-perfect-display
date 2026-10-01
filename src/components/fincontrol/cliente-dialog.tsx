import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { emptyCliente, MODULOS, valorContrato, type Cliente, type ClienteInput, type GrupoCliente } from "@/lib/clientes";
import { formatCurrency } from "@/lib/fincontrol";

const selectClass = "h-10 w-full rounded-md border border-input bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring";

export function ClienteDialog({ open, cliente, grupos, saving, onOpenChange, onCreateGrupo, onSave }: {
  open: boolean;
  cliente: Cliente | null;
  grupos: GrupoCliente[];
  saving: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateGrupo: (nome: string) => Promise<GrupoCliente>;
  onSave: (values: ClienteInput, id?: string) => void;
}) {
  const [form, setForm] = useState<ClienteInput>(emptyCliente());
  const [novoGrupo, setNovoGrupo] = useState("");

  useEffect(() => {
    if (!open) return;
    if (cliente) {
      const { id: _id, created_at: _created, updated_at: _updated, deleted_at: _deleted, ...values } = cliente;
      setForm(values);
    } else setForm(emptyCliente());
    setNovoGrupo("");
  }, [open, cliente]);

  const mensalidade = useMemo(() => valorContrato(form), [form]);
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

  function submit(event: React.FormEvent) {
    event.preventDefault();
    onSave({
      ...form,
      razao_social: form.razao_social.trim().toUpperCase(),
      nome_fantasia: form.nome_fantasia.trim().toUpperCase(),
      cnpj: form.cnpj.trim(),
      telefone: form.telefone.replace(/\D/g, ""),
      quantidade_computadores: Math.max(1, Number(form.quantidade_computadores) || 1),
      vencimento: Math.min(31, Math.max(1, Number(form.vencimento) || 5)),
      valor_base: Math.max(0, Number(form.valor_base) || 0),
      valor_computador_adicional: Math.max(0, Number(form.valor_computador_adicional) || 0),
    }, cliente?.id);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[94vh] max-w-4xl overflow-y-auto">
        <DialogHeader><DialogTitle>{cliente ? "Editar cliente" : "Novo cliente"}</DialogTitle><DialogDescription>Plano, módulos, dados técnicos e cobrança em um só cadastro.</DialogDescription></DialogHeader>
        <form onSubmit={submit} className="space-y-5">
          <section className="space-y-3"><h3 className="text-sm font-bold">Identificação e grupo</h3><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Razão social *" className="lg:col-span-2"><Input required value={form.razao_social} onChange={(e) => update("razao_social", e.target.value)} /></Field>
            <Field label="Nome fantasia"><Input value={form.nome_fantasia} onChange={(e) => update("nome_fantasia", e.target.value)} /></Field>
            <Field label="CNPJ / CPF"><Input value={form.cnpj} onChange={(e) => update("cnpj", e.target.value)} /></Field>
            <Field label="WhatsApp"><Input value={form.telefone} onChange={(e) => update("telefone", e.target.value)} /></Field>
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
            <Field label="Dia do vencimento"><Input type="number" min="1" max="31" value={form.vencimento} onChange={(e) => update("vencimento", Number(e.target.value))} /></Field>
          </div><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{MODULOS.map((modulo) => <label key={modulo} className="flex items-center gap-2 rounded-md border p-2 text-sm font-semibold"><Checkbox checked={form.modulos.includes(modulo)} onCheckedChange={(checked) => update("modulos", checked ? [...form.modulos, modulo] : form.modulos.filter((item) => item !== modulo))} />{modulo}</label>)}</div></section>

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
          <DialogFooter><Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>Cancelar</Button><Button type="submit" disabled={saving}>{saving ? "Salvando..." : "Salvar cliente"}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, className = "", children }: { label: string; className?: string; children: React.ReactNode }) {
  return <div className={`space-y-1.5 ${className}`}><Label>{label}</Label>{children}</div>;
}
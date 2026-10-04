import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Building2, CheckCircle2, Clipboard, CloudCheck, Eye, EyeOff, Loader2, MessageCircle, Search, Send, ShieldCheck } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { AppHeader } from "@/components/fincontrol/app-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { valorContrato } from "@/lib/clientes";
import { emitirAssinaturaEfi } from "@/lib/efi.functions";
import { assinaturaEfiSchema, type AssinaturaEfiInput, type CobrancaEfi } from "@/lib/efi";
import { formatCurrency, normalizePhone } from "@/lib/fincontrol";
import { useClientes } from "@/lib/use-clientes";
import { COBRANCAS_EFI_KEY, useCobrancasEfi } from "@/lib/use-cobrancas-efi";

export const Route = createFileRoute("/_authenticated/cobrancas-efi")({
  head: () => ({
    meta: [
      { title: "Cobranças Efí — FinControl Cloud" },
      { name: "description", content: "Acompanhamento das cobranças recorrentes emitidas pelo Efí Bank." },
      { property: "og:title", content: "Cobranças Efí — FinControl Cloud" },
      { property: "og:description", content: "Acompanhamento das cobranças recorrentes emitidas pelo Efí Bank." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CobrancasEfi,
});

function CobrancasEfi() {
  const { data: clientes = [], isLoading: loadingClientes } = useClientes();
  const { data: cobrancas = [], isLoading: loadingCobrancas } = useCobrancasEfi();
  const emitir = useServerFn(emitirAssinaturaEfi);
  const queryClient = useQueryClient();
  const [clienteId, setClienteId] = useState("");
  const [planId, setPlanId] = useState("");
  const [itemName, setItemName] = useState("ASSINATURA PRÁTICO SISTEMAS");
  const [valor, setValor] = useState("");
  const [vencimento, setVencimento] = useState("");
  const [mensagem, setMensagem] = useState("Pague sua mensalidade em dia e evite transtornos.");
  const [cnpj, setCnpj] = useState("");
  const [razaoSocial, setRazaoSocial] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [endereco, setEndereco] = useState("");
  const [numeroEndereco, setNumeroEndereco] = useState("");
  const [bairro, setBairro] = useState("");
  const [cep, setCep] = useState("");
  const [cidade, setCidade] = useState("");
  const [uf, setUf] = useState("");
  const [busca, setBusca] = useState("");
  const [valoresVisiveis, setValoresVisiveis] = useState(false);
  const [consultando, setConsultando] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const cliente = clientes.find((item) => item.id === clienteId);
  const filtradas = useMemo(() => {
    const termo = busca.trim().toLocaleUpperCase("pt-BR");
    if (!termo) return [];
    return cobrancas.filter((item) => `${item.cliente?.razao_social ?? ""} ${item.status} ${item.efi_charge_id ?? ""} ${item.efi_subscription_id ?? ""}`.toLocaleUpperCase("pt-BR").includes(termo));
  }, [busca, cobrancas]);

  function escolherCliente(id: string) {
    setClienteId(id);
    const selected = clientes.find((item) => item.id === id);
    if (!selected) return;
    setRazaoSocial(selected.razao_social);
    setCnpj(selected.cnpj);
    setEmail(selected.email);
    setTelefone(selected.telefone);
    setEndereco(selected.endereco);
    setNumeroEndereco(selected.numero_endereco);
    setBairro(selected.bairro);
    setCep(selected.cep);
    setCidade(selected.cidade);
    setUf(selected.uf);
    setValor(valorContrato(selected).toFixed(2));
    setVencimento(proximoVencimento(selected.vencimento));
  }

  async function consultarCnpj() {
    const numero = cnpj.replace(/\D/g, "");
    if (numero.length !== 14) { toast.error("Informe um CNPJ com 14 dígitos."); return; }
    setConsultando(true);
    try {
      const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${encodeURIComponent(numero)}`);
      if (!response.ok) throw new Error();
      const data = await response.json() as { razao_social?: string; nome_fantasia?: string };
      setRazaoSocial(data.razao_social || data.nome_fantasia || razaoSocial);
      toast.success("CNPJ encontrado. Confira os dados antes de emitir.");
    } catch {
      toast.error("Não foi possível consultar esse CNPJ.");
    } finally {
      setConsultando(false);
    }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const input: AssinaturaEfiInput = {
      clienteId, planId, itemName, valor, vencimento, mensagem, razaoSocial, cnpj,
      email, telefone, endereco, numeroEndereco, bairro, cep, cidade, uf,
    };
    const parsed = assinaturaEfiSchema.safeParse(input);
    if (!parsed.success) { toast.error(parsed.error.issues[0]?.message ?? "Confira os dados informados."); return; }
    setEnviando(true);
    try {
      const result = await emitir({ data: parsed.data });
      toast.success(result.duplicate ? "Essa assinatura já havia sido emitida; nenhum boleto foi duplicado." : "Assinatura e primeiro boleto emitidos em homologação.");
      await queryClient.invalidateQueries({ queryKey: COBRANCAS_EFI_KEY });
      setBusca(razaoSocial);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível emitir a assinatura.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b pb-5">
          <div className="flex items-center gap-3">
            <span className="rounded-md bg-brand-soft p-2 text-brand"><CloudCheck className="size-5" /></span>
            <div>
              <h1 className="text-2xl font-extrabold">Cobranças Efí</h1>
              <p className="text-sm text-muted-foreground">Assinaturas recorrentes e boletos em ambiente de homologação.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="border-warning-border bg-warning-soft text-warning"><ShieldCheck className="mr-1 size-3.5" />Homologação</Badge>
            <Button variant="outline" onClick={() => setValoresVisiveis((value) => !value)}>
              {valoresVisiveis ? <EyeOff className="size-4" /> : <Eye className="size-4" />}{valoresVisiveis ? "Ocultar valores" : "Mostrar valores"}
            </Button>
          </div>
        </div>

        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
          <form onSubmit={submit} className="space-y-5 rounded-md border bg-card p-5">
            <div><h2 className="font-bold">Gerar assinatura e boleto</h2><p className="text-xs text-muted-foreground">Escolha um cliente cadastrado e confira os dados antes de emitir.</p></div>
            <div className="space-y-2"><Label>Cliente</Label><Select value={clienteId} onValueChange={escolherCliente}><SelectTrigger><SelectValue placeholder={loadingClientes ? "Carregando clientes..." : "Selecione um cliente ativo"} /></SelectTrigger><SelectContent>{clientes.filter((item) => item.status === "ATIVO").map((item) => <SelectItem key={item.id} value={item.id}>{item.razao_social}</SelectItem>)}</SelectContent></Select></div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="ID do plano Efí"><Input inputMode="numeric" value={planId} onChange={(e) => setPlanId(e.target.value.replace(/\D/g, ""))} placeholder="Ex: 54380" /></Field>
              <Field label="Valor mensal"><Input type="number" min="0.01" max="999999.99" step="0.01" value={valor} onChange={(e) => setValor(e.target.value)} placeholder="0,00" /></Field>
            </div>
            <Field label="Nome do serviço"><Input maxLength={255} value={itemName} onChange={(e) => setItemName(e.target.value)} /></Field>
            <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
              <Field label="CNPJ"><Input maxLength={18} value={cnpj} onChange={(e) => setCnpj(e.target.value)} placeholder="00.000.000/0000-00" /></Field>
              <div className="flex items-end"><Button type="button" variant="outline" disabled={consultando} onClick={consultarCnpj}>{consultando ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}Consultar</Button></div>
            </div>
            <Field label="Razão social"><Input maxLength={255} value={razaoSocial} onChange={(e) => setRazaoSocial(e.target.value)} /></Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="E-mail"><Input type="email" maxLength={255} value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
              <Field label="Telefone / WhatsApp"><Input maxLength={20} value={telefone} onChange={(e) => setTelefone(e.target.value)} /></Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-[1fr_120px]">
              <Field label="Endereço"><Input maxLength={255} value={endereco} onChange={(e) => setEndereco(e.target.value)} /></Field>
              <Field label="Número"><Input maxLength={30} value={numeroEndereco} onChange={(e) => setNumeroEndereco(e.target.value)} /></Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Bairro"><Input maxLength={120} value={bairro} onChange={(e) => setBairro(e.target.value)} /></Field>
              <Field label="CEP"><Input maxLength={10} value={cep} onChange={(e) => setCep(e.target.value)} /></Field>
              <Field label="Cidade"><Input maxLength={120} value={cidade} onChange={(e) => setCidade(e.target.value)} /></Field>
              <Field label="UF"><Input maxLength={2} value={uf} onChange={(e) => setUf(e.target.value.toUpperCase())} /></Field>
            </div>
            <Field label="Vencimento do primeiro boleto"><Input type="date" value={vencimento} onChange={(e) => setVencimento(e.target.value)} /></Field>
            <Field label="Instruções no boleto"><Textarea maxLength={255} value={mensagem} onChange={(e) => setMensagem(e.target.value)} /></Field>
            <div className="flex items-start gap-2 rounded-md border border-brand-border bg-brand-soft p-3 text-xs text-brand"><CheckCircle2 className="mt-0.5 size-4 shrink-0" /><span>As credenciais ficam protegidas no servidor. Esta emissão não gera cobrança real enquanto estiver em homologação.</span></div>
            <Button className="w-full" type="submit" disabled={enviando || !cliente}>{enviando ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}{enviando ? "Emitindo na Efí..." : "Gerar assinatura e primeiro boleto"}</Button>
          </form>

          <section className="space-y-4 lg:sticky lg:top-4">
            <div className="rounded-md border bg-card p-5">
              <div className="mb-4 flex items-center gap-2"><Building2 className="size-4 text-primary" /><h2 className="font-bold">Resumo da emissão</h2></div>
              {cliente ? <dl className="space-y-3 text-sm"><Summary label="Cliente" value={razaoSocial || cliente.razao_social} /><Summary label="Plano do cadastro" value={cliente.plano} /><Summary label="Módulos" value={cliente.modulos.join(" · ") || "Não informados"} /><Summary label="Valor" value={valoresVisiveis ? formatCurrency(Number(valor || 0)) : "R$ ••••••"} /><Summary label="Primeiro vencimento" value={formatDate(vencimento)} /></dl> : <p className="py-12 text-center text-sm text-muted-foreground">Selecione um cliente para preencher e revisar a assinatura.</p>}
            </div>
            <div className="rounded-md border bg-card p-5"><h2 className="font-bold">Histórico de emissões</h2><p className="mb-4 text-xs text-muted-foreground">Busque um cliente, situação ou identificador para liberar a lista.</p><div className="relative"><Search className="absolute left-3 top-3 size-4 text-muted-foreground" /><Input className="pl-9" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar cobrança" /></div></div>
          </section>
        </div>

        <section className="overflow-hidden rounded-md border bg-card">
          {!busca.trim() ? <div className="p-10 text-center text-sm text-muted-foreground"><ShieldCheck className="mx-auto mb-2 size-6" />As cobranças ficam protegidas até você realizar uma busca.</div> : loadingCobrancas ? <div className="flex justify-center p-10"><Loader2 className="size-5 animate-spin" /></div> : filtradas.length ? <div className="scroll-slim overflow-x-auto"><table className="w-full whitespace-nowrap text-left text-sm"><thead className="bg-muted text-xs uppercase"><tr><th className="p-3">Cliente</th><th className="p-3">Efí</th><th className="p-3">Vencimento</th><th className="p-3 text-right">Valor</th><th className="p-3 text-center">Situação</th><th className="p-3 text-right">Ações</th></tr></thead><tbody className="divide-y">{filtradas.map((item) => <CobrancaRow key={item.id} item={item} valoresVisiveis={valoresVisiveis} />)}</tbody></table></div> : <p className="p-10 text-center text-sm text-muted-foreground">Nenhuma cobrança encontrada.</p>}
        </section>
      </main>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <div className="space-y-2"><Label>{label}</Label>{children}</div>; }

function Summary({ label, value }: { label: string; value: string }) { return <div className="flex items-start justify-between gap-4 border-b pb-3 last:border-0 last:pb-0"><dt className="text-muted-foreground">{label}</dt><dd className="max-w-[65%] text-right font-semibold whitespace-normal">{value}</dd></div>; }

function CobrancaRow({ item, valoresVisiveis }: { item: CobrancaEfi; valoresVisiveis: boolean }) {
  const copiar = async (value: string, label: string) => { await navigator.clipboard.writeText(value); toast.success(`${label} copiada.`); };
  const message = `Olá, ${item.cliente?.razao_social ?? ""}! Segue sua cobrança Efí com vencimento em ${formatDate(item.vencimento)} no valor de ${formatCurrency(item.valor)}.${item.link_pagamento ? `\nLink: ${item.link_pagamento}` : ""}${item.linha_digitavel ? `\nLinha digitável: ${item.linha_digitavel}` : ""}`;
  const phone = normalizePhone(item.cliente?.telefone ?? "");
  return <tr className="hover:bg-muted/50"><td className="p-3 font-semibold">{item.cliente?.razao_social ?? "Cliente"}</td><td className="p-3 text-xs text-muted-foreground"><p>Assinatura {item.efi_subscription_id ?? "—"}</p><p>Cobrança {item.efi_charge_id ?? "—"}</p></td><td className="p-3">{formatDate(item.vencimento)}</td><td className="p-3 text-right font-bold text-brand">{valoresVisiveis ? formatCurrency(item.valor) : "R$ ••••••"}</td><td className="p-3 text-center"><Badge variant={item.status === "ERRO" ? "destructive" : item.status === "PROCESSANDO" || item.status === "VERIFICAR" ? "secondary" : "default"}>{item.status}</Badge></td><td className="p-3"><div className="flex justify-end gap-1">{item.link_pagamento ? <Button size="icon" variant="ghost" title="Copiar link" onClick={() => copiar(item.link_pagamento, "Link")}><Clipboard className="size-4" /></Button> : null}{item.linha_digitavel ? <Button size="icon" variant="ghost" title="Copiar linha digitável" onClick={() => copiar(item.linha_digitavel, "Linha digitável")}><CloudCheck className="size-4" /></Button> : null}<Button size="icon" variant="ghost" title="Enviar pelo WhatsApp" disabled={!phone || (!item.link_pagamento && !item.linha_digitavel)} asChild={Boolean(phone && (item.link_pagamento || item.linha_digitavel))}>{phone && (item.link_pagamento || item.linha_digitavel) ? <a href={`https://wa.me/55${phone}?text=${encodeURIComponent(message)}`} target="_blank" rel="noreferrer"><MessageCircle className="size-4" /></a> : <span><MessageCircle className="size-4" /></span>}</Button></div></td></tr>;
}

function proximoVencimento(day: number): string {
  const today = new Date();
  const target = new Date(today.getFullYear(), today.getMonth(), Math.min(Math.max(day, 1), 28));
  if (target <= today) target.setMonth(target.getMonth() + 1);
  return `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, "0")}-${String(target.getDate()).padStart(2, "0")}`;
}

function formatDate(value: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return "—";
  return new Intl.DateTimeFormat("pt-BR").format(new Date(`${value}T12:00:00`));
}
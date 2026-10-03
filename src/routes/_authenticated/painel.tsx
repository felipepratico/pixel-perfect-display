import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { CloudCheck, Download, Eye, EyeOff, FileText, Filter, Loader2, LogOut, MessageCircle, Plus, Printer, Repeat, Trash2, Upload, CalendarPlus } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { KpiCards } from "@/components/fincontrol/kpi-cards";
import { Graficos } from "@/components/fincontrol/graficos";
import { Filtros, type FiltrosState } from "@/components/fincontrol/filtros";
import { TitulosTable } from "@/components/fincontrol/titulos-table";
import { TituloDialog } from "@/components/fincontrol/titulo-dialog";
import { AssinaturasDialog } from "@/components/fincontrol/assinaturas-dialog";
import { RecorrenciaDialog } from "@/components/fincontrol/recorrencia-dialog";
import { WhatsAppDialog } from "@/components/fincontrol/whatsapp-dialog";
import { ImportDialog } from "@/components/fincontrol/import-dialog";
import { RelatorioDialog } from "@/components/fincontrol/relatorio-dialog";
import { CobrancaLoteDialog } from "@/components/fincontrol/cobranca-lote-dialog";
import { AreaImpressao } from "@/components/fincontrol/impressao";
import { useTitulos, useTituloMutations } from "@/lib/use-titulos";
import { calcularTotais } from "@/lib/totais";
import { computeRow, isActiveSubscription, shiftMesAno, type Titulo, type TituloInput } from "@/lib/fincontrol";
import { exportTitulos } from "@/lib/excel";

export const Route = createFileRoute("/_authenticated/painel")({
  head: () => ({
    meta: [
      { title: "Painel — FinControl Cloud" },
      { name: "description", content: "Painel de contas a receber, lucros e assinaturas recorrentes." },
      { property: "og:title", content: "Painel — FinControl Cloud" },
      { property: "og:description", content: "Painel de contas a receber, lucros e assinaturas recorrentes." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Painel,
});

const erro = (e: unknown) => toast.error(e instanceof Error ? e.message : "Algo deu errado.");

function Painel() {
  const navigate = useNavigate();
  const { data: todos = [], isLoading } = useTitulos();
  const { saveTitulo, insertMany, patchMany, removeMany } = useTituloMutations();

  const [filtros, setFiltros] = useState<FiltrosState>({
    busca: "",
    status: "all",
    mesAno: "all",
    vencimento: "all",
    ordenacao: "clienteAsc",
  });
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [editando, setEditando] = useState<Titulo | null>(null);
  const [tituloOpen, setTituloOpen] = useState(false);
  const [whats, setWhats] = useState<Titulo | null>(null);
  const [assOpen, setAssOpen] = useState(false);
  const [recOpen, setRecOpen] = useState(false);
  const [impOpen, setImpOpen] = useState(false);
  const [relOpen, setRelOpen] = useState(false);
  const [relCliente, setRelCliente] = useState<string | null>(null);
  const [loteOpen, setLoteOpen] = useState(false);
  const [valoresVisiveis, setValoresVisiveis] = useState(false);
  const [impressao, setImpressao] = useState<{ titulos: Titulo[]; subtitulo: string } | null>(null);

  function imprimir(lista: Titulo[], subtitulo: string) {
    if (!lista.length) {
      toast.info("Nada para imprimir com os filtros atuais.");
      return;
    }
    setImpressao({ titulos: lista, subtitulo });
    setTimeout(() => window.print(), 120);
  }

  const mesesDisponiveis = useMemo(
    () => [...new Set(todos.map((t) => t.mes_ano).filter(Boolean))].sort(),
    [todos],
  );

  const filtrados = useMemo(() => {
    const busca = filtros.busca.trim().toUpperCase();
    const list = todos.filter((t) => {
      if (busca && !t.cliente.toUpperCase().includes(busca) && !t.cnpj.includes(busca)) return false;
      if (filtros.status === "RECORRENTE" ? !isActiveSubscription(t) : filtros.status !== "all" && t.situacao !== filtros.status) return false;
      if (filtros.mesAno && filtros.mesAno !== "all" && t.mes_ano !== filtros.mesAno) return false;
      if (filtros.vencimento && filtros.vencimento !== "all" && String(t.vencimento) !== filtros.vencimento) return false;
      return true;
    });
    return list.sort((a, b) => {
      switch (filtros.ordenacao) {
        case "vencimentoAsc": return a.vencimento - b.vencimento;
        case "lucroFelipeDesc": return computeRow(b).lucroFelipe - computeRow(a).lucroFelipe;
        case "mensalSiteDesc": return b.mensal_site - a.mensal_site;
        default: return a.cliente.localeCompare(b.cliente);
      }
    });
  }, [todos, filtros]);

  const filtroAplicado =
    filtros.busca.trim().length > 0 ||
    filtros.status !== "all" ||
    filtros.mesAno !== "all" ||
    filtros.vencimento !== "all";
  const clientesVisiveis = filtroAplicado ? filtrados : [];

  const totais = useMemo(
    () => calcularTotais(clientesVisiveis, todos),
    [clientesVisiveis, todos],
  );

  function onSave(values: TituloInput, id?: string) {
    saveTitulo.mutate(id ? { id, values } : { values }, {
      onSuccess: () => { toast.success("Lançamento salvo."); setTituloOpen(false); },
      onError: erro,
    });
  }

  function onGerar(mesAnoInicial: string, quantidade: number) {
    const base = new Map<string, Titulo>();
    for (const t of todos) if (isActiveSubscription(t)) base.set(t.cliente, t);
    const existentes = new Set(todos.map((t) => `${t.cliente}|${t.mes_ano}`));
    const rows: TituloInput[] = [];
    for (let i = 0; i < quantidade; i++) {
      const mes = shiftMesAno(mesAnoInicial, i);
      if (!mes) continue;
      for (const t of base.values()) {
        if (existentes.has(`${t.cliente}|${mes}`)) continue;
        const {
          id: _id,
          deleted_at: _deletedAt,
          efi_status: _efiStatus,
          efi_link_pagamento: _efiLink,
          efi_linha_digitavel: _efiLinha,
          ...rest
        } = t;
        rows.push({ ...rest, mes_ano: mes, situacao: "ABERTO" });
      }
    }
    if (!rows.length) { toast.info("Nenhuma mensalidade nova para gerar."); return; }
    insertMany.mutate(rows, {
      onSuccess: (n) => { toast.success(`${n} mensalidades geradas.`); setRecOpen(false); },
      onError: erro,
    });
  }

  const ids = [...selecionados];

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-shell text-shell-foreground">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-brand p-2.5 text-brand-foreground"><CloudCheck className="size-5" /></div>
            <span className="font-extrabold">FinControl Cloud</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant={valoresVisiveis ? "default" : "secondary"}
              onClick={() => setValoresVisiveis((visivel) => !visivel)}
              aria-pressed={valoresVisiveis}
            >
              {valoresVisiveis ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              {valoresVisiveis ? "Ocultar valores" : "Mostrar valores"}
            </Button>
            <Button size="sm" onClick={() => { setEditando(null); setTituloOpen(true); }}><Plus className="size-4" />Lançamento</Button>
            <Button size="sm" variant="secondary" onClick={() => setAssOpen(true)}><Repeat className="size-4" />Assinaturas</Button>
            <Button size="sm" variant="secondary" onClick={() => setRecOpen(true)}><CalendarPlus className="size-4" />Gerar meses</Button>
            <Button size="sm" variant="secondary" onClick={() => setImpOpen(true)}><Upload className="size-4" />Importar</Button>
            <Button size="sm" variant="secondary" disabled={!filtroAplicado || !valoresVisiveis} onClick={() => exportTitulos(clientesVisiveis)}><Download className="size-4" />Exportar</Button>
            <Button size="sm" variant="secondary" disabled={!filtroAplicado} onClick={() => { setRelCliente(null); setRelOpen(true); }}><FileText className="size-4" />Relatórios</Button>
            <Button size="sm" variant="secondary" disabled={!filtroAplicado || !valoresVisiveis} onClick={() => imprimir(clientesVisiveis, `Agrupado por vencimento${filtros.mesAno !== "all" ? ` · ${filtros.mesAno}` : ""}${filtros.status !== "all" ? ` · ${filtros.status}` : ""}`)}><Printer className="size-4" />Imprimir</Button>
            <Button size="sm" variant="ghost" onClick={async () => { await supabase.auth.signOut(); void navigate({ to: "/auth" }); }}><LogOut className="size-4" /></Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6">
        {isLoading ? (
          <div className="flex justify-center py-20"><Loader2 className="size-6 animate-spin" /></div>
        ) : (
          <>
            <Filtros state={filtros} onChange={(n) => setFiltros((s) => ({ ...s, ...n }))} mesesDisponiveis={mesesDisponiveis} />
            <KpiCards totais={totais} valoresVisiveis={valoresVisiveis} />
            <Graficos titulos={clientesVisiveis} totais={totais} valoresVisiveis={valoresVisiveis} />
            {ids.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-card p-3 text-sm">
                <span className="font-semibold">{ids.length} selecionado(s)</span>
                <Button size="sm" variant="outline" onClick={() => patchMany.mutate({ ids, values: { situacao: "PAGO" } }, { onError: erro })}>Marcar pago</Button>
                <Button size="sm" variant="outline" onClick={() => patchMany.mutate({ ids, values: { situacao: "ABERTO" } }, { onError: erro })}>Marcar aberto</Button>
                <Button size="sm" variant="outline" className="border-brand/30 bg-brand-soft text-brand hover:bg-brand-soft" onClick={() => setLoteOpen(true)}><MessageCircle className="size-4" />Cobrar no WhatsApp</Button>
                <Button size="sm" variant="outline" disabled={!valoresVisiveis} onClick={() => imprimir(clientesVisiveis.filter((t) => selecionados.has(t.id)), "Selecionados — agrupado por vencimento")}><Printer className="size-4" />Imprimir seleção</Button>
                <Button size="sm" variant="destructive" onClick={() => {
                  if (!confirm(`Excluir ${ids.length} lançamento(s)?`)) return;
                  removeMany.mutate(ids, { onSuccess: () => setSelecionados(new Set()), onError: erro });
                }}><Trash2 className="size-4" />Excluir</Button>
              </div>
            )}
            {!filtroAplicado ? (
              <div className="card-panel flex min-h-56 items-center justify-center p-8 text-center">
                <div className="max-w-md space-y-2 text-muted-foreground">
                  <Filter className="mx-auto size-7" />
                  <p className="text-base font-bold text-foreground">Clientes protegidos</p>
                  <p className="text-xs">Busque um cliente ou escolha situação, mês ou vencimento para liberar a lista.</p>
                </div>
              </div>
            ) : (
              <TitulosTable
                titulos={clientesVisiveis}
                totais={totais}
                valoresVisiveis={valoresVisiveis}
                selecionados={selecionados}
                onToggle={(id) => setSelecionados((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; })}
                onToggleTodos={(m) => setSelecionados(m ? new Set(clientesVisiveis.map((t) => t.id)) : new Set())}
                onEditar={(t) => { setEditando(t); setTituloOpen(true); }}
                onWhatsApp={setWhats}
                onRelatorio={(t) => { setRelCliente(t.cliente); setRelOpen(true); }}
                onAlternarSituacao={(t) => patchMany.mutate({ ids: [t.id], values: { situacao: t.situacao === "PAGO" ? "ABERTO" : "PAGO" } }, { onError: erro })}
                onExcluir={(t) => { if (confirm(`Excluir ${t.cliente}?`)) removeMany.mutate([t.id], { onError: erro }); }}
              />
            )}
          </>
        )}
      </main>

      <TituloDialog open={tituloOpen} titulo={editando} saving={saveTitulo.isPending} onOpenChange={setTituloOpen} onSave={onSave} />
      <AssinaturasDialog open={assOpen} titulos={todos} valoresVisiveis={valoresVisiveis} onOpenChange={setAssOpen}
        onAlternar={(i, ativar) => patchMany.mutate({ ids: i, values: { status_assinatura: ativar ? "ATIVO" : "CANCELADO" } }, { onError: erro })} />
      <RecorrenciaDialog open={recOpen} titulos={todos} gerando={insertMany.isPending} onOpenChange={setRecOpen} onGerar={onGerar} />
      <WhatsAppDialog open={!!whats} titulo={whats} onOpenChange={(o) => !o && setWhats(null)} />
      <ImportDialog open={impOpen} importando={insertMany.isPending} onOpenChange={setImpOpen}
        onImportar={(rows) => insertMany.mutate(rows, {
          onSuccess: (n) => { toast.success(`${n} lançamentos importados.`); setImpOpen(false); },
          onError: erro,
        })} />
      <RelatorioDialog open={relOpen} titulos={clientesVisiveis} clienteInicial={relCliente} valoresVisiveis={valoresVisiveis} onOpenChange={setRelOpen} onImprimir={imprimir} />
      <CobrancaLoteDialog open={loteOpen} titulos={clientesVisiveis.filter((t) => selecionados.has(t.id))} valoresVisiveis={valoresVisiveis} onOpenChange={setLoteOpen} />
      {impressao ? <AreaImpressao titulos={impressao.titulos} subtitulo={impressao.subtitulo} /> : null}
    </div>
  );
}

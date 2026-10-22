import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  CalendarPlus,
  CheckCircle2,
  CloudCheck,
  Download,
  Eye,
  EyeOff,
  FileText,
  Filter,
  Loader2,
  LogOut,
  MessageCircle,
  Plus,
  Printer,
  Repeat,
  Sparkles,
  Trash2,
  Upload,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import { AppHeader } from "@/components/fincontrol/app-header";
import { AssinaturasDialog } from "@/components/fincontrol/assinaturas-dialog";
import { CobrancaLoteDialog } from "@/components/fincontrol/cobranca-lote-dialog";
import { Filtros, type FiltrosState } from "@/components/fincontrol/filtros";
import { GeminiInsightsDialog } from "@/components/fincontrol/gemini-insights-dialog";
import { Graficos } from "@/components/fincontrol/graficos";
import { ImportDialog } from "@/components/fincontrol/import-dialog";
import { AreaImpressao } from "@/components/fincontrol/impressao";
import { KpiCards } from "@/components/fincontrol/kpi-cards";
import { RecorrenciaDialog } from "@/components/fincontrol/recorrencia-dialog";
import { RelatorioDialog } from "@/components/fincontrol/relatorio-dialog";
import { TituloDialog } from "@/components/fincontrol/titulo-dialog";
import { TitulosTable } from "@/components/fincontrol/titulos-table";
import { WhatsAppDialog } from "@/components/fincontrol/whatsapp-dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { exportTitulos } from "@/lib/excel";
import {
  computeRow,
  getDiasVencido,
  isActiveSubscription,
  isTituloAVencer,
  isTituloVencido,
  shiftMesAno,
  type Titulo,
  type TituloInput,
} from "@/lib/fincontrol";
import { calcularTotais } from "@/lib/totais";
import { useClientes } from "@/lib/use-clientes";
import { useTituloMutations, useTitulos } from "@/lib/use-titulos";

export const Route = createFileRoute("/_authenticated/painel")({
  head: () => ({
    meta: [
      { title: "Painel — UPSYSTEM FINCONTROL" },
      {
        name: "description",
        content: "Painel de contas a receber, lucros e assinaturas recorrentes.",
      },
      { property: "og:title", content: "Painel — UPSYSTEM FINCONTROL" },
      {
        property: "og:description",
        content: "Painel de contas a receber, lucros e assinaturas recorrentes.",
      },
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
  const { data: clientesCadastrados = [] } = useClientes();
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
  const [valoresVisiveis, setValoresVisiveis] = useState(true);
  const [geminiOpen, setGeminiOpen] = useState(false);
  const [confirmarPago, setConfirmarPago] = useState<{
    ids: string[];
    nomes?: string[];
  } | null>(null);
  const [impressao, setImpressao] = useState<{ titulos: Titulo[]; subtitulo: string } | null>(null);

  function imprimir(lista: Titulo[], subtitulo: string) {
    if (!lista.length) {
      toast.info("Nada para imprimir com os filtros atuais.");
      return;
    }
    setImpressao({ titulos: lista, subtitulo });
    setTimeout(() => window.print(), 120);
  }

  const titulosVencidos = useMemo(
    () => todos.filter(isTituloVencido).map((t) => ({ ...t, diasAtraso: getDiasVencido(t) })),
    [todos],
  );

  const countAVencer = useMemo(() => todos.filter(isTituloAVencer).length, [todos]);

  const mesesDisponiveis = useMemo(
    () => [...new Set(todos.map((t) => t.mes_ano).filter(Boolean))].sort(),
    [todos],
  );

  const filtrados = useMemo(() => {
    const busca = filtros.busca.trim().toUpperCase();
    const list = todos.filter((t) => {
      if (busca && !t.cliente.toUpperCase().includes(busca) && !t.cnpj.includes(busca))
        return false;
      if (filtros.status === "VENCIDO") {
        if (!isTituloVencido(t)) return false;
      } else if (filtros.status === "AVENCER") {
        if (!isTituloAVencer(t)) return false;
      } else if (filtros.status === "RECORRENTE") {
        if (!isActiveSubscription(t)) return false;
      } else if (filtros.status !== "all" && t.situacao !== filtros.status) {
        return false;
      }
      if (filtros.mesAno && filtros.mesAno !== "all" && t.mes_ano !== filtros.mesAno) return false;
      if (
        filtros.vencimento &&
        filtros.vencimento !== "all" &&
        String(t.vencimento) !== filtros.vencimento
      )
        return false;
      return true;
    });
    return list.sort((a, b) => {
      switch (filtros.ordenacao) {
        case "vencimentoAsc":
          return a.vencimento - b.vencimento;
        case "lucroFelipeDesc":
          return computeRow(b).lucroFelipe - computeRow(a).lucroFelipe;
        case "mensalSiteDesc":
          return b.mensal_site - a.mensal_site;
        default:
          return a.cliente.localeCompare(b.cliente);
      }
    });
  }, [todos, filtros]);

  const clientesVisiveis = filtrados;

  const totais = useMemo(() => calcularTotais(clientesVisiveis, todos), [clientesVisiveis, todos]);

  function onSave(values: TituloInput, id?: string) {
    saveTitulo.mutate(id ? { id, values } : { values }, {
      onSuccess: () => {
        toast.success("Lançamento salvo.");
        setTituloOpen(false);
      },
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

        // Auto link with customer record if missing
        let cId = rest.cliente_id;
        if (!cId) {
          const match = clientesCadastrados.find(
            (c) =>
              (c.cnpj && c.cnpj.replace(/\D/g, "") === rest.cnpj.replace(/\D/g, "")) ||
              c.razao_social.trim().toUpperCase() === rest.cliente.trim().toUpperCase(),
          );
          if (match) cId = match.id;
        }

        rows.push({ ...rest, cliente_id: cId, mes_ano: mes, situacao: "ABERTO" });
      }
    }
    if (!rows.length) {
      toast.info("Nenhuma mensalidade nova para gerar.");
      return;
    }
    insertMany.mutate(rows, {
      onSuccess: (n) => {
        toast.success(`${n} mensalidades geradas.`);
        setRecOpen(false);
      },
      onError: erro,
    });
  }

  const ids = [...selecionados];

  const valorAberto = useMemo(
    () => todos.filter((t) => t.situacao === "ABERTO").reduce((acc, t) => acc + t.mensal_site, 0),
    [todos],
  );
  const valorPago = useMemo(
    () => todos.filter((t) => t.situacao === "PAGO").reduce((acc, t) => acc + t.mensal_site, 0),
    [todos],
  );

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      {/* Toolbar superior de ações (alinhada com a imagem) */}
      <div className="border-b border-border/60 bg-card/70 backdrop-blur-md print:hidden">
        <div className="flex w-full flex-wrap items-center justify-between gap-2 px-3 py-2.5 sm:px-4">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              onClick={() => setValoresVisiveis((visivel) => !visivel)}
              aria-pressed={valoresVisiveis}
              className={`gap-1.5 rounded-lg font-semibold text-xs transition-colors ${
                valoresVisiveis
                  ? "bg-blue-600 text-white hover:bg-blue-700 shadow-sm"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              }`}
            >
              {valoresVisiveis ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
              {valoresVisiveis ? "Ocultar valores" : "Mostrar valores"}
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setEditando(null);
                setTituloOpen(true);
              }}
              className="gap-1.5 rounded-lg bg-sky-500 font-semibold text-xs text-white hover:bg-sky-600 shadow-sm"
            >
              <Plus className="size-3.5" />
              Lançamento
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setAssOpen(true)}
              className="gap-1.5 rounded-lg text-xs font-semibold"
            >
              <Repeat className="size-3.5" />
              Assinaturas
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setRecOpen(true)}
              className="gap-1.5 rounded-lg text-xs font-semibold"
            >
              <CalendarPlus className="size-3.5" />
              Gerar meses
            </Button>
            <Button
              size="sm"
              variant="secondary"
              asChild
              className="gap-1.5 rounded-lg text-xs font-semibold"
            >
              <Link to="/cobrancas-efi">
                <CloudCheck className="size-3.5" />
                Cobranças Efí
              </Link>
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setImpOpen(true)}
              className="gap-1.5 rounded-lg text-xs font-semibold"
            >
              <Upload className="size-3.5" />
              Importar
            </Button>
            <Button
              size="sm"
              variant="secondary"
              disabled={!valoresVisiveis || clientesVisiveis.length === 0}
              onClick={() => exportTitulos(clientesVisiveis)}
              className="gap-1.5 rounded-lg text-xs font-semibold"
            >
              <Download className="size-3.5" />
              Exportar
            </Button>
            <Button
              size="sm"
              variant="secondary"
              disabled={clientesVisiveis.length === 0}
              onClick={() => {
                setRelCliente(null);
                setRelOpen(true);
              }}
              className="gap-1.5 rounded-lg text-xs font-semibold"
            >
              <FileText className="size-3.5" />
              Relatórios
            </Button>
            <Button
              size="sm"
              variant="secondary"
              disabled={!valoresVisiveis || clientesVisiveis.length === 0}
              onClick={() =>
                imprimir(
                  clientesVisiveis,
                  `Agrupado por vencimento${filtros.mesAno !== "all" ? ` · ${filtros.mesAno}` : ""}${filtros.status !== "all" ? ` · ${filtros.status}` : ""}`,
                )
              }
              className="gap-1.5 rounded-lg text-xs font-semibold"
            >
              <Printer className="size-3.5" />
              Imprimir
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Botão de destaque do Gemini */}
            <Button
              size="sm"
              onClick={() => setGeminiOpen(true)}
              className="gap-1.5 rounded-lg bg-gradient-to-r from-brand via-primary to-indigo-600 text-xs font-extrabold text-white shadow-md shadow-brand/20 transition-all hover:opacity-90"
            >
              <Sparkles className="size-3.5 animate-pulse" />
              Gemini IA
              {titulosVencidos.length > 0 && (
                <span className="rounded-full bg-white/20 px-1.5 py-0.2 text-[10px] font-black">
                  {titulosVencidos.length}
                </span>
              )}
            </Button>

            <Button
              size="icon"
              variant="ghost"
              className="size-8 rounded-lg text-muted-foreground hover:text-foreground"
              title="Sair"
              onClick={async () => {
                await supabase.auth.signOut();
                void navigate({ to: "/auth" });
              }}
            >
              <LogOut className="size-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Conteúdo Principal organizado conforme a imagem: Cartões -> Gráficos -> Filtros -> Tabela */}
      <main className="w-full space-y-4 px-3 py-4 sm:px-4">
        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* 1. Cartões de KPI */}
            <KpiCards totais={totais} valoresVisiveis={valoresVisiveis} />

            {/* 2. Gráficos */}
            <Graficos
              titulos={clientesVisiveis}
              totais={totais}
              valoresVisiveis={valoresVisiveis}
            />

            {/* 3. Filtros */}
            <Filtros
              state={filtros}
              onChange={(n) => setFiltros((s) => ({ ...s, ...n }))}
              mesesDisponiveis={mesesDisponiveis}
              countAVencer={countAVencer}
              countVencidos={titulosVencidos.length}
            />

            {/* Ações em lote caso haja itens selecionados */}
            {ids.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border/70 bg-card p-3 text-xs">
                <span className="font-semibold text-foreground">{ids.length} selecionado(s)</span>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={() => {
                    const selecionadosList = clientesVisiveis.filter((t) => selecionados.has(t.id));
                    setConfirmarPago({
                      ids,
                      nomes: selecionadosList.map((t) => t.cliente),
                    });
                  }}
                >
                  Marcar pago
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={() =>
                    patchMany.mutate({ ids, values: { situacao: "ABERTO" } }, { onError: erro })
                  }
                >
                  Marcar aberto
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 border-emerald-500/30 bg-emerald-950/30 text-emerald-400 hover:bg-emerald-900/40 gap-1 text-xs"
                  onClick={() => setLoteOpen(true)}
                >
                  <MessageCircle className="size-3.5" />
                  Cobrar no WhatsApp
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  disabled={!valoresVisiveis}
                  onClick={() =>
                    imprimir(
                      clientesVisiveis.filter((t) => selecionados.has(t.id)),
                      "Selecionados — agrupado por vencimento",
                    )
                  }
                >
                  <Printer className="size-3.5" />
                  Imprimir seleção
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  className="h-7 text-xs"
                  onClick={() => {
                    if (!confirm(`Excluir ${ids.length} lançamento(s)?`)) return;
                    removeMany.mutate(ids, {
                      onSuccess: () => setSelecionados(new Set()),
                      onError: erro,
                    });
                  }}
                >
                  <Trash2 className="size-3.5" />
                  Excluir
                </Button>
              </div>
            )}

            {/* 4. Tabela de Lançamentos */}
            <TitulosTable
              titulos={clientesVisiveis}
              totais={totais}
              valoresVisiveis={valoresVisiveis}
              selecionados={selecionados}
              onToggle={(id) =>
                setSelecionados((s) => {
                  const n = new Set(s);
                  if (n.has(id)) n.delete(id);
                  else n.add(id);
                  return n;
                })
              }
              onToggleTodos={(m) =>
                setSelecionados(m ? new Set(clientesVisiveis.map((t) => t.id)) : new Set())
              }
              onEditar={(t) => {
                setEditando(t);
                setTituloOpen(true);
              }}
              onWhatsApp={setWhats}
              onRelatorio={(t) => {
                setRelCliente(t.cliente);
                setRelOpen(true);
              }}
              onAlternarSituacao={(t) => {
                if (t.situacao !== "PAGO") {
                  setConfirmarPago({
                    ids: [t.id],
                    nomes: [t.cliente],
                  });
                } else {
                  patchMany.mutate(
                    { ids: [t.id], values: { situacao: "ABERTO" } },
                    { onError: erro },
                  );
                }
              }}
              onExcluir={(t) => {
                if (confirm(`Excluir ${t.cliente}?`)) removeMany.mutate([t.id], { onError: erro });
              }}
            />
          </>
        )}
      </main>

      <TituloDialog
        open={tituloOpen}
        titulo={editando}
        saving={saveTitulo.isPending}
        onOpenChange={setTituloOpen}
        onSave={onSave}
      />
      <AssinaturasDialog
        open={assOpen}
        titulos={clientesVisiveis}
        valoresVisiveis={valoresVisiveis}
        onOpenChange={setAssOpen}
        onAlternar={(i, ativar) =>
          patchMany.mutate(
            { ids: i, values: { status_assinatura: ativar ? "ATIVO" : "CANCELADO" } },
            { onError: erro },
          )
        }
      />
      <RecorrenciaDialog
        open={recOpen}
        titulos={todos}
        gerando={insertMany.isPending}
        onOpenChange={setRecOpen}
        onGerar={onGerar}
      />
      <WhatsAppDialog open={!!whats} titulo={whats} onOpenChange={(o) => !o && setWhats(null)} />
      <ImportDialog
        open={impOpen}
        importando={insertMany.isPending}
        onOpenChange={setImpOpen}
        onImportar={(rows) =>
          insertMany.mutate(rows, {
            onSuccess: (n) => {
              toast.success(`${n} lançamentos importados.`);
              setImpOpen(false);
            },
            onError: erro,
          })
        }
      />
      <RelatorioDialog
        open={relOpen}
        titulos={clientesVisiveis}
        clienteInicial={relCliente}
        valoresVisiveis={valoresVisiveis}
        onOpenChange={setRelOpen}
        onImprimir={imprimir}
      />
      <CobrancaLoteDialog
        open={loteOpen}
        titulos={clientesVisiveis.filter((t) => selecionados.has(t.id))}
        valoresVisiveis={valoresVisiveis}
        onOpenChange={setLoteOpen}
      />
      <GeminiInsightsDialog
        open={geminiOpen}
        onOpenChange={setGeminiOpen}
        titulosVencidos={titulosVencidos}
        totalAberto={valorAberto}
        totalPago={valorPago}
        onCobrarWhatsapp={(t) => setWhats(t)}
      />
      <AlertDialog
        open={!!confirmarPago}
        onOpenChange={(open) => {
          if (!open) setConfirmarPago(null);
        }}
      >
        <AlertDialogContent className="border border-border/80 bg-card text-card-foreground shadow-2xl sm:max-w-md">
          <AlertDialogHeader>
            <div className="flex items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400">
                <CheckCircle2 className="size-5" />
              </div>
              <div className="space-y-1 text-left">
                <AlertDialogTitle className="text-base font-semibold">
                  Marcar como pago
                </AlertDialogTitle>
                <AlertDialogDescription className="text-sm font-medium text-foreground">
                  Deseja realmente marcar como pago?
                </AlertDialogDescription>
              </div>
            </div>
          </AlertDialogHeader>
          <div className="rounded-lg border border-border/60 bg-muted/30 p-3 text-xs text-muted-foreground">
            {confirmarPago && confirmarPago.ids.length === 1 ? (
              <p>
                O lançamento de{" "}
                <strong className="text-foreground font-semibold">
                  {confirmarPago.nomes?.[0] || "1 lançamento"}
                </strong>{" "}
                será atualizado para <span className="font-semibold text-emerald-400">PAGO</span>.
              </p>
            ) : (
              <p>
                Os{" "}
                <strong className="text-foreground font-semibold">
                  {confirmarPago?.ids.length} lançamentos selecionados
                </strong>{" "}
                serão atualizados para <span className="font-semibold text-emerald-400">PAGO</span>.
              </p>
            )}
          </div>
          <AlertDialogFooter className="gap-2 sm:gap-2">
            <AlertDialogCancel className="h-8 text-xs">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              className="h-8 bg-emerald-600 text-xs font-semibold text-white hover:bg-emerald-500"
              onClick={() => {
                if (!confirmarPago) return;
                const totalIds = confirmarPago.ids;
                patchMany.mutate(
                  { ids: totalIds, values: { situacao: "PAGO" } },
                  {
                    onSuccess: () => {
                      toast.success(
                        totalIds.length === 1
                          ? "Lançamento marcado como pago com sucesso!"
                          : `${totalIds.length} lançamentos marcados como pagos!`,
                      );
                      setSelecionados((prev) => {
                        const next = new Set(prev);
                        totalIds.forEach((id) => next.delete(id));
                        return next;
                      });
                      setConfirmarPago(null);
                    },
                    onError: erro,
                  },
                );
              }}
            >
              Sim, marcar como pago
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {impressao ? (
        <AreaImpressao titulos={impressao.titulos} subtitulo={impressao.subtitulo} />
      ) : null}
    </div>
  );
}

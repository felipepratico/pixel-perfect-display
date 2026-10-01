import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { CloudCheck, Download, Loader2, LogOut, Plus, Repeat, Trash2, Upload, CalendarPlus } from "lucide-react";
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

  const totais = useMemo(() => calcularTotais(filtrados, todos), [filtrados, todos]);

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
        const { id: _id, ...rest } = t;
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
            <Button size="sm" onClick={() => { setEditando(null); setTituloOpen(true); }}><Plus className="size-4" />Lançamento</Button>
            <Button size="sm" variant="secondary" onClick={() => setAssOpen(true)}><Repeat className="size-4" />Assinaturas</Button>
            <Button size="sm" variant="secondary" onClick={() => setRecOpen(true)}><CalendarPlus className="size-4" />Gerar meses</Button>
            <Button size="sm" variant="secondary" onClick={() => setImpOpen(true)}><Upload className="size-4" />Importar</Button>
            <Button size="sm" variant="secondary" onClick={() => exportTitulos(filtrados)}><Download className="size-4" />Exportar</Button>
            <Button size="sm" variant="ghost" onClick={async () => { await supabase.auth.signOut(); void navigate({ to: "/auth" }); }}><LogOut className="size-4" /></Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6">
        {isLoading ? (
          <div className="flex justify-center py-20"><Loader2 className="size-6 animate-spin" /></div>
        ) : (
          <>
            <KpiCards totais={totais} />
            <Graficos titulos={filtrados} totais={totais} />
            <Filtros state={filtros} onChange={(n) => setFiltros((s) => ({ ...s, ...n }))} mesesDisponiveis={mesesDisponiveis} />
            {ids.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-card p-3 text-sm">
                <span className="font-semibold">{ids.length} selecionado(s)</span>
                <Button size="sm" variant="outline" onClick={() => patchMany.mutate({ ids, values: { situacao: "PAGO" } }, { onError: erro })}>Marcar pago</Button>
                <Button size="sm" variant="outline" onClick={() => patchMany.mutate({ ids, values: { situacao: "ABERTO" } }, { onError: erro })}>Marcar aberto</Button>
                <Button size="sm" variant="destructive" onClick={() => {
                  if (!confirm(`Excluir ${ids.length} lançamento(s)?`)) return;
                  removeMany.mutate(ids, { onSuccess: () => setSelecionados(new Set()), onError: erro });
                }}><Trash2 className="size-4" />Excluir</Button>
              </div>
            )}
            <TitulosTable
              titulos={filtrados}
              totais={totais}
              selecionados={selecionados}
              onToggle={(id) => setSelecionados((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; })}
              onToggleTodos={(m) => setSelecionados(m ? new Set(filtrados.map((t) => t.id)) : new Set())}
              onEditar={(t) => { setEditando(t); setTituloOpen(true); }}
              onWhatsApp={setWhats}
              onAlternarSituacao={(t) => patchMany.mutate({ ids: [t.id], values: { situacao: t.situacao === "PAGO" ? "ABERTO" : "PAGO" } }, { onError: erro })}
              onExcluir={(t) => { if (confirm(`Excluir ${t.cliente}?`)) removeMany.mutate([t.id], { onError: erro }); }}
            />
          </>
        )}
      </main>

      <TituloDialog open={tituloOpen} titulo={editando} saving={saveTitulo.isPending} onOpenChange={setTituloOpen} onSave={onSave} />
      <AssinaturasDialog open={assOpen} titulos={todos} onOpenChange={setAssOpen}
        onAlternar={(i, ativar) => patchMany.mutate({ ids: i, values: { status_assinatura: ativar ? "ATIVO" : "CANCELADO" } }, { onError: erro })} />
      <RecorrenciaDialog open={recOpen} titulos={todos} gerando={insertMany.isPending} onOpenChange={setRecOpen} onGerar={onGerar} />
      <WhatsAppDialog open={!!whats} titulo={whats} onOpenChange={(o) => !o && setWhats(null)} />
      <ImportDialog open={impOpen} importando={insertMany.isPending} onOpenChange={setImpOpen}
        onImportar={(rows) => insertMany.mutate(rows, {
          onSuccess: (n) => { toast.success(`${n} lançamentos importados.`); setImpOpen(false); },
          onError: erro,
        })} />
    </div>
  );
}

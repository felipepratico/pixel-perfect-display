import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { RotateCcw, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { AppHeader } from "@/components/fincontrol/app-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useClienteMutations, useClientes } from "@/lib/use-clientes";

export const Route = createFileRoute("/_authenticated/auditoria")({
  head: () => ({ meta: [
    { title: "Histórico e lixeira — UPSYSTEM FINCONTROL" }, { name: "description", content: "Auditoria de alterações, novos cadastros e recuperação de clientes excluídos." },
    { property: "og:title", content: "Histórico e lixeira — FinControl Cloud" }, { property: "og:description", content: "Auditoria de alterações, novos cadastros e recuperação de clientes excluídos." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  component: AuditoriaPage,
});

type Audit = { id: string; tabela: string; acao: string; resumo: string; created_at: string };

function AuditoriaPage() {
  const { data: todos = [] } = useClientes(true);
  const { restoreCliente } = useClienteMutations();
  const [inicio, setInicio] = useState("");
  const [fim, setFim] = useState("");
  const { data: eventos = [] } = useQuery({ queryKey: ["auditoria"], queryFn: async (): Promise<Audit[]> => { const { data, error } = await supabase.from("auditoria").select("id, tabela, acao, resumo, created_at").order("created_at", { ascending: false }).limit(500); if (error) throw error; return data as Audit[]; } });
  const filtrados = useMemo(() => eventos.filter((item) => { const dia = item.created_at.slice(0, 10); return (!inicio || dia >= inicio) && (!fim || dia <= fim); }), [eventos, inicio, fim]);
  const lixeira = todos.filter((cliente) => cliente.deleted_at);

  return <div className="min-h-screen bg-background"><AppHeader /><main className="mx-auto max-w-7xl space-y-6 px-4 py-6"><div><h1 className="text-2xl font-extrabold">Histórico e auditoria</h1><p className="text-sm text-muted-foreground">Novos cadastros, alterações, exclusões e restaurações por período.</p></div>
    <section className="flex flex-wrap items-end gap-3 rounded-md border bg-card p-4"><label className="space-y-1 text-xs font-semibold">Data inicial<Input type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} /></label><label className="space-y-1 text-xs font-semibold">Data final<Input type="date" value={fim} onChange={(e) => setFim(e.target.value)} /></label><span className="ml-auto flex items-center gap-2 text-sm text-muted-foreground"><Search className="size-4" />{filtrados.length} evento(s)</span></section>
    <section className="grid gap-6 lg:grid-cols-[1fr_360px]"><div className="overflow-hidden rounded-md border bg-card"><div className="scroll-slim max-h-[620px] overflow-auto"><table className="w-full text-left text-sm"><thead className="sticky top-0 bg-muted text-xs uppercase"><tr><th className="p-3">Data e hora</th><th className="p-3">Área</th><th className="p-3">Ação</th><th className="p-3">Registro</th></tr></thead><tbody className="divide-y">{filtrados.map((item) => <tr key={item.id}><td className="p-3">{new Date(item.created_at).toLocaleString("pt-BR")}</td><td className="p-3">{item.tabela}</td><td className="p-3"><Badge variant={item.acao === "EXCLUÍDO" ? "destructive" : "outline"}>{item.acao}</Badge></td><td className="p-3 font-semibold">{item.resumo || "—"}</td></tr>)}</tbody></table></div></div><aside className="rounded-md border bg-card p-4"><h2 className="font-bold">Lixeira de clientes</h2><p className="mb-4 text-xs text-muted-foreground">Cadastros removidos podem ser restaurados.</p><div className="space-y-2">{lixeira.map((cliente) => <div key={cliente.id} className="flex items-center justify-between gap-2 rounded-md border p-3"><div className="min-w-0"><p className="truncate text-sm font-semibold">{cliente.razao_social}</p><p className="text-xs text-muted-foreground">{cliente.deleted_at ? new Date(cliente.deleted_at).toLocaleString("pt-BR") : ""}</p></div><Button size="icon" variant="outline" title="Restaurar" onClick={() => restoreCliente.mutate(cliente.id, { onSuccess: () => toast.success("Cliente restaurado."), onError: (e) => toast.error(e.message) })}><RotateCcw className="size-4" /></Button></div>)}{!lixeira.length ? <p className="py-6 text-center text-sm text-muted-foreground">A lixeira está vazia.</p> : null}</div></aside></section>
  </main></div>;
}

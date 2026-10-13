import { createFileRoute } from "@tanstack/react-router";
import { Building2, CircleDollarSign, Eye, EyeOff, Pencil, Plus, Search, Trash2, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { AppHeader } from "@/components/fincontrol/app-header";
import { ClienteDialog } from "@/components/fincontrol/cliente-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/fincontrol";
import { ticketMedio, valorContrato, type Cliente, type ClienteInput } from "@/lib/clientes";
import { useClienteMutations, useClientes, useGrupos } from "@/lib/use-clientes";

export const Route = createFileRoute("/_authenticated/clientes")({
  head: () => ({ meta: [
    { title: "Clientes e contratos — UPSYSTEM FINCONTROL" },
    { name: "description", content: "Cadastro de clientes, grupos, planos, módulos e contratos." },
    { property: "og:title", content: "Clientes e contratos — FinControl Cloud" },
    { property: "og:description", content: "Cadastro de clientes, grupos, planos, módulos e contratos." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: ClientesPage,
});

function ClientesPage() {
  const { data: clientes = [], isLoading } = useClientes();
  const { data: grupos = [] } = useGrupos();
  const { saveCliente, softDeleteCliente, createGrupo } = useClienteMutations();
  const [busca, setBusca] = useState("");
  const [grupo, setGrupo] = useState("all");
  const [open, setOpen] = useState(false);
  const [editando, setEditando] = useState<Cliente | null>(null);
  const [valoresVisiveis, setValoresVisiveis] = useState(false);

  const visiveis = useMemo(() => {
    const termo = busca.trim().toLocaleUpperCase("pt-BR");
    return clientes.filter((cliente) => {
      if (grupo !== "all" && cliente.grupo_id !== grupo) return false;
      return !termo || `${cliente.razao_social} ${cliente.nome_fantasia} ${cliente.cnpj}`.toLocaleUpperCase("pt-BR").includes(termo);
    });
  }, [clientes, busca, grupo]);

  const ativos = clientes.filter((cliente) => cliente.status === "ATIVO").length;
  const receita = clientes.filter((cliente) => cliente.status === "ATIVO").reduce((total, cliente) => total + valorContrato(cliente), 0);
  const erro = (error: unknown) => toast.error(error instanceof Error ? error.message : "Não foi possível concluir.");

  function salvar(values: ClienteInput, id?: string) {
    const payload = id ? { id, values } : { values };
    saveCliente.mutate(payload, { onSuccess: () => { toast.success("Cliente salvo."); setOpen(false); }, onError: erro });
  }

  return <div className="min-h-screen bg-background"><AppHeader /><main className="mx-auto max-w-7xl space-y-6 px-4 py-6">
    <div className="flex flex-wrap items-end justify-between gap-3"><div><h1 className="text-2xl font-extrabold">Clientes e contratos</h1><p className="text-sm text-muted-foreground">Planos, grupos, computadores, módulos e dados técnicos.</p></div><div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => setValoresVisiveis((visivel) => !visivel)} aria-pressed={valoresVisiveis}>{valoresVisiveis ? <EyeOff className="size-4" /> : <Eye className="size-4" />}{valoresVisiveis ? "Ocultar valores" : "Mostrar valores"}</Button><Button onClick={() => { setEditando(null); setOpen(true); }}><Plus className="size-4" />Novo cliente</Button></div></div>
    <section className="grid gap-3 sm:grid-cols-3">
      <Metric icon={Users} label="Clientes ativos" value={String(ativos)} />
      <Metric icon={CircleDollarSign} label="Receita contratada" value={valoresVisiveis ? formatCurrency(receita) : "R$ ••••••"} />
      <Metric icon={Building2} label="Ticket médio" value={valoresVisiveis ? formatCurrency(ticketMedio(clientes)) : "R$ ••••••"} />
    </section>
    <section className="flex flex-col gap-3 sm:flex-row"><div className="relative flex-1"><Search className="absolute left-3 top-3 size-4 text-muted-foreground" /><Input className="pl-9" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por nome ou CNPJ" /></div><select className="h-10 rounded-md border border-input bg-card px-3 text-sm" value={grupo} onChange={(e) => setGrupo(e.target.value)}><option value="all">Todos os grupos</option>{grupos.map((item) => <option key={item.id} value={item.id}>{item.nome}</option>)}</select></section>
    <div className="overflow-hidden rounded-md border bg-card"><div className="scroll-slim overflow-x-auto"><table className="w-full whitespace-nowrap text-left text-sm"><thead className="bg-muted text-xs uppercase"><tr><th className="p-2">Cliente / grupo</th><th className="p-2">Plano e módulos</th><th className="p-2 text-center">Computadores</th><th className="p-2 text-right">Mensalidade</th><th className="p-2 text-center">Status</th><th className="p-2 text-center">Ações</th></tr></thead><tbody className="divide-y">{visiveis.map((cliente) => <tr key={cliente.id} className="hover:bg-muted/50"><td className="p-2"><strong>{cliente.razao_social}</strong><p className="text-xs text-muted-foreground">{grupos.find((item) => item.id === cliente.grupo_id)?.nome ?? "Sem grupo"} · {cliente.cnpj || "CNPJ não informado"}</p></td><td className="p-2"><Badge variant="outline">{cliente.plano}</Badge><p className="mt-1 max-w-md truncate text-xs text-muted-foreground">{cliente.modulos.join(" · ") || "Sem módulos"}</p></td><td className="p-2 text-center">{cliente.quantidade_computadores}</td><td className="p-2 text-right font-bold text-brand">{valoresVisiveis ? formatCurrency(valorContrato(cliente)) : "R$ ••••••"}</td><td className="p-2 text-center"><Badge variant={cliente.status === "ATIVO" ? "default" : "secondary"}>{cliente.status}</Badge></td><td className="p-2"><div className="flex justify-center gap-1"><Button size="icon" variant="ghost" title="Editar cliente" onClick={() => { setEditando(cliente); setOpen(true); }}><Pencil className="size-4" /></Button><Button size="icon" variant="ghost" className="text-destructive" title="Mover para a lixeira" onClick={() => { if (confirm(`Mover ${cliente.razao_social} para a lixeira?`)) softDeleteCliente.mutate(cliente.id, { onSuccess: () => toast.success("Cliente movido para a lixeira."), onError: erro }); }}><Trash2 className="size-4" /></Button></div></td></tr>)}</tbody></table></div>{!isLoading && visiveis.length === 0 ? <p className="p-10 text-center text-sm text-muted-foreground">Nenhum cliente encontrado.</p> : null}</div>
  </main><ClienteDialog open={open} cliente={editando} grupos={grupos} saving={saveCliente.isPending} onOpenChange={setOpen} onCreateGrupo={(nome) => createGrupo.mutateAsync(nome)} onSave={salvar} /></div>;
}

function Metric({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: string }) {
  return <div className="rounded-md border bg-card p-4"><div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground"><Icon className="size-4" />{label}</div><p className="text-2xl font-extrabold">{value}</p></div>;
}

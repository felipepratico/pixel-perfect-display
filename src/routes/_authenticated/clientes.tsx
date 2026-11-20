import { createFileRoute } from "@tanstack/react-router";
import {
  Building2,
  CircleDollarSign,
  Eye,
  EyeOff,
  FileText,
  Pencil,
  Plus,
  Receipt,
  Search,
  Trash2,
  Users,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { ClienteDialog } from "@/components/fincontrol/cliente-dialog";
import { ContratoModal } from "@/components/fincontrol/contrato-modal";
import { ReciboModal } from "@/components/fincontrol/recibo-modal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/fincontrol";
import { BadgePerfilPagamento } from "@/components/fincontrol/badge-perfil-pagamento";
import { CardAdimplencia } from "@/components/fincontrol/card-adimplencia";
import { calcularHistoricoClientes } from "@/lib/adimplencia";
import { ticketMedio, valorContrato, valorBoletoCliente as valorBoleto, valorBoletoConsolidadoCliente as valorBoletoConsolidado, valorPraticoConsolidadoCliente as valorPraticoConsolidado, type Cliente, type ClienteInput } from "@/lib/clientes";
import { useClienteMutations, useClientes, useGrupos } from "@/lib/use-clientes";
import { buscarAliasesCnpj, type ClienteAliasCnpj } from "@/lib/conciliacao-efi";
import { useTitulos } from "@/lib/use-titulos";

export const Route = createFileRoute("/_authenticated/clientes")({
  head: () => ({
    meta: [
      { title: "Clientes e contratos — UPSYSTEM FINCONTROL" },
      {
        name: "description",
        content: "Cadastro de clientes, grupos, planos, módulos e contratos.",
      },
      { property: "og:title", content: "Clientes e contratos — FinControl Cloud" },
      {
        property: "og:description",
        content: "Cadastro de clientes, grupos, planos, módulos e contratos.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ClientesPage,
});

function ClientesPage() {
  const { data: clientes = [], isLoading } = useClientes();
  const [aliasesCnpj, setAliasesCnpj] = useState<ClienteAliasCnpj[]>([]);
  useEffect(() => {
    buscarAliasesCnpj().then(setAliasesCnpj);
  }, []);
  const { data: grupos = [] } = useGrupos();
  const { data: titulos = [] } = useTitulos();
  const { saveCliente, softDeleteCliente, createGrupo, patchCliente } = useClienteMutations();
  const [busca, setBusca] = useState("");
  const [grupo, setGrupo] = useState("all");
  const [statusFiltro, setStatusFiltro] = useState("all");
  const [adimplenciaFiltro, setAdimplenciaFiltro] = useState("all");
  const [filtroCnpj, setFiltroCnpj] = useState("all");
  const [open, setOpen] = useState(false);
  const [editando, setEditando] = useState<Cliente | null>(null);
  const [valoresVisiveis, setValoresVisiveis] = useState(false);

  const [clienteContrato, setClienteContrato] = useState<Cliente | null>(null);
  const [contratoOpen, setContratoOpen] = useState(false);
  const [clienteRecibo, setClienteRecibo] = useState<Cliente | null>(null);
  const [reciboOpen, setReciboOpen] = useState(false);

  const historico = calcularHistoricoClientes(titulos, clientes);
  const historicoPorCliente = new Map(historico.map((h) => [h.clienteId, h]));

  const visiveis = useMemo(() => {
    const termo = busca.trim().toLocaleUpperCase("pt-BR");
    return clientes.filter((cliente) => {
      if (grupo !== "all" && cliente.grupo_id !== grupo) return false;
      if (statusFiltro !== "all" && cliente.status !== statusFiltro) return false;
      const digitosCnpj = (cliente.cnpj || "").replace(/\D/g, "");
      if (filtroCnpj === "incompleto" && digitosCnpj.length >= 14) return false;
      if (filtroCnpj === "completo" && digitosCnpj.length !== 14) return false;
      if (adimplenciaFiltro !== "all") {
        const perfil = historicoPorCliente.get(cliente.id)?.perfil;
        if (adimplenciaFiltro === "INADIMPLENTE" ? perfil !== "INADIMPLENTE" : perfil !== "ADIMPLENTE")
          return false;
      }
      return (
        !termo ||
        `${cliente.razao_social} ${cliente.nome_fantasia} ${cliente.cnpj} ${cliente.codigo_site} ${aliasesCnpj.filter((a) => a.cliente_id === cliente.id).map((a) => a.cnpj).join(" ")}`
          .toLocaleUpperCase("pt-BR")
          .includes(termo)
      );
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientes, titulos, busca, grupo, statusFiltro, adimplenciaFiltro, aliasesCnpj, filtroCnpj]);

  const ativos = clientes.filter((cliente) => cliente.status === "ATIVO").length;
  const incompletosCnpj = clientes.filter((cliente) => (cliente.cnpj || "").replace(/\D/g, "").length < 14).length;
  const receita = clientes
    .filter((cliente) => cliente.status === "ATIVO" && !cliente.nao_gerar_assinatura)
    .reduce((total, cliente) => total + valorBoletoConsolidado(cliente, aliasesCnpj, clientes), 0);
  const clientesKpi = clientes.filter((cliente) => cliente.status === "ATIVO" && !cliente.nao_gerar_assinatura);
  const totalValorPratico = clientesKpi.reduce(
    (total, cliente) => total + valorPraticoConsolidado(cliente, aliasesCnpj, clientes),
    0,
  );
  const margemValorPratico = receita - totalValorPratico;
  const erro = (error: unknown) =>
    toast.error(error instanceof Error ? error.message : "Não foi possível concluir.");

  function salvar(values: ClienteInput, id?: string) {
    const payload = id ? { id, values } : { values };
    saveCliente.mutate(payload, {
      onSuccess: () => {
        toast.success("Cliente salvo.");
        setOpen(false);
      },
      onError: erro,
    });
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="w-full space-y-6 px-3 py-6 sm:px-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold">Clientes e contratos</h1>
            <p className="text-sm text-muted-foreground">
              Planos, grupos, computadores, módulos e dados técnicos.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => setValoresVisiveis((visivel) => !visivel)}
              aria-pressed={valoresVisiveis}
            >
              {valoresVisiveis ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              {valoresVisiveis ? "Ocultar valores" : "Mostrar valores"}
            </Button>
            <Button
              onClick={() => {
                setEditando(null);
                setOpen(true);
              }}
            >
              <Plus className="size-4" />
              Novo cliente
            </Button>
          </div>
        </div>
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Metric icon={Users} label="Clientes ativos" value={String(ativos)} />
          <Metric
            icon={CircleDollarSign}
            label="Receita contratada"
            value={valoresVisiveis ? formatCurrency(receita) : "R$ ••••••"}
          />
          <Metric
            icon={Building2}
            label="Ticket médio"
            value={valoresVisiveis ? formatCurrency(ticketMedio(clientes)) : "R$ ••••••"}
          />
          <div className="rounded-md border bg-card p-4">
            <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
              <CircleDollarSign className="size-4" />
              Total Valor Prático
            </div>
            <p className="text-2xl font-extrabold">
              {valoresVisiveis ? formatCurrency(totalValorPratico) : "R$ ••••••"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {valoresVisiveis
                ? `Margem: ${formatCurrency(margemValorPratico)}`
                : "Margem: R$ ••••••"
              }
            </p>
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-3">
          <CardAdimplencia
            titulos={titulos}
            clientes={clientes}
            valoresVisiveis={valoresVisiveis}
          />
        </section>
        <section className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 size-4 text-muted-foreground" />
            <Input
              className="pl-9"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por nome, CNPJ ou Cód. Site"
            />
          </div>
          <select
            aria-label="Filtrar por adimplência"
            className="h-10 rounded-md border border-input bg-card px-3 text-sm"
            value={adimplenciaFiltro}
            onChange={(e) => setAdimplenciaFiltro(e.target.value)}
          >
            <option value="all">Toda adimplência</option>
            <option value="ADIMPLENTE">Bom padrão</option>
            <option value="INADIMPLENTE">Inadimplente</option>
          </select>
          <select
            aria-label="Filtrar por status"
            className="h-10 rounded-md border border-input bg-card px-3 text-sm"
            value={statusFiltro}
            onChange={(e) => setStatusFiltro(e.target.value)}
          >
            <option value="all">Todos os status</option>
            <option value="ATIVO">Ativo</option>
            <option value="INATIVO">Inativo</option>
          </select>
          <select
            className="h-10 rounded-md border border-input bg-card px-3 text-sm"
            value={grupo}
            onChange={(e) => setGrupo(e.target.value)}
          >
            <option value="all">Todos os grupos</option>
            {grupos.map((item) => (
              <option key={item.id} value={item.id}>
                {item.nome}
              </option>
            ))}
          </select>
          <select
            aria-label="Filtrar por CNPJ"
            className="h-10 rounded-md border border-input bg-card px-3 text-sm"
            value={filtroCnpj}
            onChange={(e) => setFiltroCnpj(e.target.value)}
          >
            <option value="all">Todos os documentos</option>
            <option value="incompleto">CNPJ incompleto ({incompletosCnpj})</option>
            <option value="completo">CNPJ completo</option>
          </select>
          {filtroCnpj === "incompleto" && incompletosCnpj > 0 ? (
            <Button
              type="button"
              variant="outline"
              onClick={async () => {
                const alvos = clientes.filter((c) => {
                  const d = (c.cnpj || "").replace(/\D/g, "");
                  return d.length > 0 && d.length < 14;
                });
                for (const c of alvos) {
                  const d = (c.cnpj || "").replace(/\D/g, "");
                  await patchCliente.mutateAsync({ id: c.id, values: { cnpj: d.padStart(14, "0") } as any });
                }
                toast.success(`${alvos.length} CNPJ(s) completado(s) com zeros à esquerda.`);
              }}
            >
              Completar zeros à esquerda
            </Button>
          ) : null}
        </section>
        <div className="overflow-hidden rounded-md border bg-card">
          <div className="scroll-slim overflow-x-auto">
            <table className="w-full whitespace-nowrap text-left text-sm">
              <thead className="bg-muted text-xs uppercase">
                 <tr>
                   <th className="p-2">Cliente / grupo</th>
                   <th className="p-2">Plano e módulos</th>
                   <th className="p-2 text-center">Computadores</th>
                   <th className="p-2 text-right">Mensalidade</th>
                   <th className="p-2 text-right">Valor Prático</th>
                   <th className="p-2 text-center">Status</th>
                   <th className="p-2 text-center">Adimplência</th>
                   <th className="p-2 text-center">Ações</th>
                 </tr>
              </thead>
              <tbody className="divide-y">
                {visiveis.map((cliente) => (
                  <tr key={cliente.id} className="hover:bg-muted/50">
                    <td className="p-2">
                      <strong>{cliente.razao_social}</strong>
                      <p className="text-xs text-muted-foreground">
                        {grupos.find((item) => item.id === cliente.grupo_id)?.nome ?? "Sem grupo"} ·{" "}
                        {cliente.cnpj || "CNPJ não informado"}
                        {(() => {
                          const d = (cliente.cnpj || "").replace(/\D/g, "");
                          return d.length > 0 && d.length < 14
                            ? ` ⬢ ${d.length} dígitos ⬢ falta zero à esquerda?`
                            : "";
                        })()}
                        {cliente.nao_gerar_assinatura ? (
                          <Badge variant="secondary" className="ml-1 bg-slate-200 text-slate-700">
                            Sem cobrança
                          </Badge>
                        ) : null}{" "}
                        {cliente.codigo_site && `Cód. Site: ${cliente.codigo_site}`}
                      </p>
                    </td>
                    <td className="p-2">
                      <Badge variant="outline">{cliente.plano}</Badge>
                      <p className="mt-1 max-w-md truncate text-xs text-muted-foreground">
                        {cliente.modulos.join(" · ") || "Sem módulos"}
                      </p>
                    </td>
                    <td className="p-2 text-center">{cliente.quantidade_computadores}</td>
                    <td className="p-2 text-right font-bold text-brand">
                      {valoresVisiveis ? formatCurrency(valorBoletoConsolidado(cliente, aliasesCnpj, clientes)) : "R$ ••••••"}
                    </td>
                    <td className={`p-2 text-right ${valorPraticoConsolidado(cliente, aliasesCnpj, clientes) > valorBoletoConsolidado(cliente, aliasesCnpj, clientes) ? "text-amber-500" : ""}`}>
                      {valoresVisiveis ? (cliente.nao_gerar_assinatura ? <span className="text-muted-foreground/50">—</span> : formatCurrency(valorPraticoConsolidado(cliente, aliasesCnpj, clientes))) : "R$ ••••••"}
                    </td>
                    <td className="p-2 text-center">
                      <Badge variant={cliente.status === "ATIVO" ? "default" : "secondary"}>
                        {cliente.status}
                      </Badge>
                    </td>
                    <td className="p-2 text-center">
                      {historicoPorCliente.get(cliente.id) ? (
                        <BadgePerfilPagamento
                          perfil={historicoPorCliente.get(cliente.id)!.perfil}
                        />
                      ) : (
                        <span className="text-[10px] text-muted-foreground">Sem lançamentos</span>
                      )}
                    </td>
                    <td className="p-2">
                      <div className="flex justify-center gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-primary hover:text-primary hover:bg-primary/10"
                          title="Gerar Contrato"
                          aria-label="Gerar Contrato"
                          onClick={() => {
                            setClienteContrato(cliente);
                            setContratoOpen(true);
                          }}
                        >
                          <FileText className="size-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10"
                          title="Gerar Recibo"
                          aria-label="Gerar Recibo"
                          onClick={() => {
                            setClienteRecibo(cliente);
                            setReciboOpen(true);
                          }}
                        >
                          <Receipt className="size-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          title="Editar cliente"
                          onClick={() => {
                            setEditando(cliente);
                            setOpen(true);
                          }}
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-destructive"
                          title="Mover para a lixeira"
                          onClick={() => {
                            if (confirm(`Mover ${cliente.razao_social} para a lixeira?`))
                              softDeleteCliente.mutate(cliente.id, {
                                onSuccess: () => toast.success("Cliente movido para a lixeira."),
                                onError: erro,
                              });
                          }}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!isLoading && visiveis.length === 0 ? (
            <p className="p-10 text-center text-sm text-muted-foreground">
              Nenhum cliente encontrado.
            </p>
          ) : null}
        </div>
      </main>
      <ClienteDialog
        open={open}
        cliente={editando}
        grupos={grupos}
        saving={saveCliente.isPending}
        onOpenChange={setOpen}
        onCreateGrupo={(nome) => createGrupo.mutateAsync(nome)}
        onSave={salvar}
        onAbrirCliente={(c) => setEditando(c)}
      />
      <ContratoModal open={contratoOpen} cliente={clienteContrato} onOpenChange={setContratoOpen} />
      <ReciboModal open={reciboOpen} cliente={clienteRecibo} onOpenChange={setReciboOpen} />
    </div>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Users;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-md border bg-card p-4">
      <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
        <Icon className="size-4" />
        {label}
      </div>
      <p className="text-2xl font-extrabold">{value}</p>
    </div>
  );
}



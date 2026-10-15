import { createFileRoute } from "@tanstack/react-router";
import {
  AlertTriangle,
  CheckCircle2,
  DatabaseBackup,
  Pencil,
  RefreshCw,
  ShieldCheck,
  Trash2,
  Undo2,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AppHeader } from "@/components/fincontrol/app-header";
import { ClienteDialog } from "@/components/fincontrol/cliente-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { diasAte, diasDesde, type Cliente, type ClienteInput } from "@/lib/clientes";
import { useClienteMutations, useClientes, useConfiguracoes, useGrupos } from "@/lib/use-clientes";

export const Route = createFileRoute("/_authenticated/operacao")({
  head: () => ({
    meta: [
      { title: "Operação técnica — UPSYSTEM FINCONTROL" },
      {
        name: "description",
        content: "Controle de backups, versões, VPN e certificados dos clientes.",
      },
      { property: "og:title", content: "Operação técnica — FinControl Cloud" },
      {
        property: "og:description",
        content: "Controle de backups, versões, VPN e certificados dos clientes.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: OperacaoPage,
});

function OperacaoPage() {
  const [mostrarExcluidos, setMostrarExcluidos] = useState(false);
  const { data: clientes = [] } = useClientes(mostrarExcluidos);
  const { data: grupos = [] } = useGrupos();
  const {
    data: config = {
      versao_atual: "2026.09",
      dias_alerta_backup: 7,
      dias_alerta_certificado: 30,
      efi_ambiente: "HOMOLOGACAO" as const,
    },
  } = useConfiguracoes();
  const { createGrupo, restoreCliente, saveCliente, saveConfiguracoes, softDeleteCliente } =
    useClienteMutations();
  const [versao, setVersao] = useState(config.versao_atual);
  const [open, setOpen] = useState(false);
  const [editando, setEditando] = useState<Cliente | null>(null);
  const ativos = clientes.filter((cliente) => !cliente.deleted_at);

  function salvar(values: ClienteInput, id?: string) {
    const payload = id ? { id, values } : { values };
    saveCliente.mutate(payload, {
      onSuccess: () => {
        toast.success("Cliente salvo.");
        setOpen(false);
      },
      onError: (e) => toast.error(e.message),
    });
  }
  const atualizados = ativos.filter((c) => c.versao_instalada === config.versao_atual).length;
  const backupsAtrasados = ativos.filter(
    (c) => (diasDesde(c.ultimo_backup) ?? 9999) > config.dias_alerta_backup,
  ).length;
  const certificados = ativos.filter((c) => {
    const dias = diasAte(c.validade_certificado);
    return dias !== null && dias <= config.dias_alerta_certificado;
  }).length;

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="w-full space-y-6 px-3 py-6 sm:px-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold">Operação técnica</h1>
            <p className="text-sm text-muted-foreground">
              Prioridades de atualização, backup, certificado e acesso VPN.
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setMostrarExcluidos((visivel) => !visivel)}
              aria-pressed={mostrarExcluidos}
            >
              <Trash2 className="size-4" />
              {mostrarExcluidos ? "Mostrar ativos" : "Lixeira"}
            </Button>
            <Input
              className="w-32"
              value={versao}
              onChange={(e) => setVersao(e.target.value)}
              aria-label="Versão atual"
            />
            <Button
              onClick={() =>
                saveConfiguracoes.mutate(
                  { ...config, versao_atual: versao.trim() },
                  {
                    onSuccess: () => toast.success("Versão atualizada."),
                    onError: (e) => toast.error(e.message),
                  },
                )
              }
            >
              <RefreshCw className="size-4" />
              Definir versão atual
            </Button>
          </div>
        </div>
        <section className="grid gap-3 sm:grid-cols-3">
          <Stat
            icon={CheckCircle2}
            label="Atualizados"
            value={`${atualizados} de ${ativos.length}`}
            tone="text-brand"
          />
          <Stat
            icon={DatabaseBackup}
            label="Backups atrasados"
            value={String(backupsAtrasados)}
            tone="text-warning"
          />
          <Stat
            icon={ShieldCheck}
            label="Certificados em alerta"
            value={String(certificados)}
            tone="text-destructive"
          />
        </section>
        <div className="overflow-hidden rounded-md border bg-card">
          <div className="scroll-slim overflow-x-auto">
            <table className="w-full whitespace-nowrap text-left text-sm">
              <thead className="bg-muted text-xs uppercase">
                <tr>
                  <th className="p-3">Cliente</th>
                  <th className="p-3">Versão</th>
                  <th className="p-3">Último backup</th>
                  <th className="p-3">Certificado</th>
                  <th className="p-3">Rede VPN</th>
                  <th className="p-3">Prioridade</th>
                  <th className="p-3 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {clientes.map((cliente) => {
                  const atraso = diasDesde(cliente.ultimo_backup);
                  const cert = diasAte(cliente.validade_certificado);
                  const desatualizado = cliente.versao_instalada !== config.versao_atual;
                  const urgente =
                    desatualizado ||
                    (atraso ?? 9999) > config.dias_alerta_backup ||
                    (cert !== null && cert <= config.dias_alerta_certificado);
                  return (
                    <tr key={cliente.id} className="hover:bg-muted/50">
                      <td className="p-3 font-bold">{cliente.razao_social}</td>
                      <td className="p-3">
                        <Badge variant={desatualizado ? "secondary" : "default"}>
                          {cliente.versao_instalada || "NÃO INFORMADA"}
                        </Badge>
                      </td>
                      <td className="p-3">
                        {cliente.ultimo_backup
                          ? `${cliente.ultimo_backup.split("-").reverse().join("/")} · ${atraso} dia(s)`
                          : "Não informado"}
                      </td>
                      <td className="p-3">
                        {cliente.tipo_certificado || "—"}{" "}
                        {cliente.validade_certificado
                          ? `· ${cliente.validade_certificado.split("-").reverse().join("/")}`
                          : ""}
                      </td>
                      <td className="p-3 font-mono text-xs">{cliente.rede_vpn || "—"}</td>
                      <td className="p-3">
                        {urgente ? (
                          <span className="inline-flex items-center gap-1 font-semibold text-warning">
                            <AlertTriangle className="size-4" />
                            Revisar
                          </span>
                        ) : (
                          <span className="font-semibold text-brand">Em dia</span>
                        )}
                      </td>
                      <td className="p-3">
                        {cliente.deleted_at ? (
                          <div className="flex justify-center gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              title="Restaurar cliente"
                              onClick={() =>
                                restoreCliente.mutate(cliente.id, {
                                  onSuccess: () => toast.success("Cliente restaurado."),
                                  onError: (e) => toast.error(e.message),
                                })
                              }
                            >
                              <Undo2 className="size-4" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex justify-center gap-1">
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
                                    onSuccess: () =>
                                      toast.success("Cliente movido para a lixeira."),
                                    onError: (e) => toast.error(e.message),
                                  });
                              }}
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
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
      />
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof CheckCircle2;
  label: string;
  value: string;
  tone: string;
}) {
  return (
    <div className="rounded-md border bg-card p-4">
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Icon className={`size-4 ${tone}`} />
        {label}
      </p>
      <p className="mt-2 text-2xl font-extrabold">{value}</p>
    </div>
  );
}

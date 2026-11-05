import { KeyRound, Loader2, Lock, ShieldCheck, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { EfiDiagnostico } from "@/lib/efi";

type Ambiente = "HOMOLOGACAO" | "PRODUCAO";

export type CredenciaisEfiValues = {
  ambiente: Ambiente;
  clientId?: string;
  clientSecret?: string;
  webhookToken?: string;
};

const selectClass =
  "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm outline-none focus:ring-2 focus:ring-ring";

export function EfiCredenciaisDialog({
  open,
  diagnostico,
  saving,
  removendo,
  testando,
  onOpenChange,
  onSalvar,
  onRemover,
  onTestar,
}: {
  open: boolean;
  diagnostico?: EfiDiagnostico | undefined;
  saving: boolean;
  removendo: boolean;
  testando: boolean;
  onOpenChange: (open: boolean) => void;
  onSalvar: (values: CredenciaisEfiValues) => void | Promise<void>;
  onRemover: () => void | Promise<void>;
  onTestar: () => void | Promise<void>;
}) {
  const [ambiente, setAmbiente] = useState<Ambiente>("HOMOLOGACAO");
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [webhookToken, setWebhookToken] = useState("");

  useEffect(() => {
    if (!open) return;
    setAmbiente(diagnostico?.ambiente ?? "HOMOLOGACAO");
    setClientId("");
    setClientSecret("");
    setWebhookToken("");
  }, [open, diagnostico?.ambiente]);

  const origem = diagnostico?.origemCredenciais ?? "NENHUMA";
  const temCredenciaisSalvas = origem === "SISTEMA";

  const placeholderClientId = diagnostico?.clientIdMascarado
    ? `Salvo: ${diagnostico.clientIdMascarado} — deixe em branco para manter`
    : "Client ID da aplicação Efí";

  const placeholderSecret =
    diagnostico?.clientSecretConfigurado || temCredenciaisSalvas
      ? "•••••••• (configurado) — deixe em branco para manter"
      : "Client Secret da aplicação Efí";

  const placeholderToken = diagnostico?.webhookConfigurado
    ? "•••••••• (configurado) — deixe em branco para manter"
    : "Token do webhook (você escolhe)";

  function salvar(event: React.FormEvent) {
    event.preventDefault();
    void onSalvar({
      ambiente,
      ...(clientId.trim() ? { clientId: clientId.trim() } : {}),
      ...(clientSecret.trim() ? { clientSecret: clientSecret.trim() } : {}),
      ...(webhookToken.trim() ? { webhookToken: webhookToken.trim() } : {}),
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="size-4 text-brand" />
            Credenciais Efí Bank
          </DialogTitle>
          <DialogDescription>
            Cadastre aqui as credenciais da sua aplicação Efí. Os segredos são cifrados no servidor
            e nunca retornam para o navegador — a tela mostra apenas valores mascarados.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-start gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3 text-[11px] text-emerald-700 dark:text-emerald-400">
          <Lock className="mt-0.5 size-3.5 shrink-0" />
          <span>
            Client Secret e token do webhook ficam salvos criptografados (AES-256-GCM) em uma tabela
            acessível somente pelo servidor. Ao salvar com um campo em branco, o valor atual é
            preservado.
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
          <span className="font-semibold">Origem atual:</span>
          <Badge
            variant="outline"
            className={
              origem === "SISTEMA"
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600"
                : origem === "AMBIENTE"
                  ? "border-sky-500/40 bg-sky-500/10 text-sky-600"
                  : "border-warning-border bg-warning-soft text-warning"
            }
          >
            {origem === "SISTEMA"
              ? "Cadastradas no sistema"
              : origem === "AMBIENTE"
                ? "Variáveis de ambiente"
                : "Nenhuma credencial"}
          </Badge>
          {diagnostico ? (
            <span>
              Ambiente em uso: <strong>{diagnostico.ambiente}</strong> ·{" "}
              {diagnostico.credenciaisConfiguradas
                ? "credenciais completas"
                : "credenciais incompletas"}
            </span>
          ) : null}
        </div>

        <form onSubmit={salvar} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="efiAmbiente">Ambiente</Label>
            <select
              id="efiAmbiente"
              className={selectClass}
              value={ambiente}
              onChange={(event) => setAmbiente(event.target.value as Ambiente)}
            >
              <option value="HOMOLOGACAO">Homologação (sandbox)</option>
              <option value="PRODUCAO">Produção</option>
            </select>
            <p className="text-[11px] text-muted-foreground">
              Use homologação até validar a emissão e o webhook.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="efiClientId">Client ID</Label>
            <Input
              id="efiClientId"
              autoComplete="off"
              spellCheck={false}
              value={clientId}
              onChange={(event) => setClientId(event.target.value)}
              placeholder={placeholderClientId}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="efiClientSecret">Client Secret</Label>
            <Input
              id="efiClientSecret"
              type="password"
              autoComplete="new-password"
              spellCheck={false}
              value={clientSecret}
              onChange={(event) => setClientSecret(event.target.value)}
              placeholder={placeholderSecret}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="efiWebhookToken">Token do webhook</Label>
            <Input
              id="efiWebhookToken"
              type="password"
              autoComplete="new-password"
              spellCheck={false}
              value={webhookToken}
              onChange={(event) => setWebhookToken(event.target.value)}
              placeholder={placeholderToken}
            />
            <p className="text-[11px] text-muted-foreground">
              Cadastre na Efí a URL <code>{diagnostico?.webhookPath ?? "/api/efi/webhook"}</code>{" "}
              com <code>?token=SEU_TOKEN</code>. Este token é o que valida a origem das
              notificações.
            </p>
          </div>

          <DialogFooter className="flex-wrap gap-2 pt-1 sm:justify-between">
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => void onTestar()}
                disabled={testando || saving}
                className="gap-1.5"
              >
                {testando ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <ShieldCheck className="size-3.5" />
                )}
                {testando ? "Testando..." : "Testar conexão"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (
                    confirm(
                      "Remover as credenciais salvas? A integração volta a usar as variáveis de ambiente do servidor.",
                    )
                  ) {
                    void onRemover();
                  }
                }}
                disabled={removendo || saving || !temCredenciaisSalvas}
                className="gap-1.5 border-destructive/40 text-destructive hover:bg-destructive/10"
              >
                {removendo ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Trash2 className="size-3.5" />
                )}
                Remover credenciais
              </Button>
            </div>
            <Button type="submit" disabled={saving} className="gap-1.5">
              {saving ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Lock className="size-3.5" />
              )}
              {saving ? "Salvando..." : "Salvar credenciais"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

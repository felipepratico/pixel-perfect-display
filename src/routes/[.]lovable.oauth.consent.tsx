import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ShieldCheck, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/.lovable/oauth/consent")({
  ssr: false,
  validateSearch: (search: Record<string, unknown>) => ({
    authorization_id: typeof search['authorization_id'] === "string" ? search['authorization_id'] : "",
  }),
  head: () => ({ meta: [
    { title: "Autorizar assistente — UPSYSTEM FINCONTROL" },
    { name: "description", content: "Autorize um assistente a consultar os dados da sua conta FinControl." },
    { property: "og:title", content: "Autorizar assistente — UPSYSTEM FINCONTROL" },
    { property: "og:description", content: "Conexão segura de assistentes à sua conta FinControl." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  beforeLoad: async ({ search, location }) => {
    if (!search.authorization_id) throw new Error("Solicitação de autorização ausente. Inicie a conexão novamente pelo assistente.");
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw redirect({ to: "/auth", search: { next: location.pathname + location.searchStr } });
  },
  loader: async ({ location }) => {
    const id = new URLSearchParams(location.searchStr).get("authorization_id");
    if (!id) throw new Error("Solicitação de autorização ausente.");
    const { data, error } = await supabase.auth.oauth.getAuthorizationDetails(id);
    if (error) throw new Error("Esta solicitação expirou ou não está disponível. Inicie a conexão novamente pelo assistente.");
    if (data && "redirect_url" in data && typeof data.redirect_url === "string") throw redirect({ href: data.redirect_url });
    if (!data || !("client" in data)) throw new Error("Solicitação de autorização inválida.");
    return data;
  },
  pendingComponent: () => <main className="flex min-h-screen items-center justify-center bg-background"><Loader2 className="size-6 animate-spin text-primary" aria-label="Carregando autorização" /></main>,
  errorComponent: ({ error }) => <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-4 px-6"><h1 className="text-xl font-bold">Não foi possível autorizar</h1><p role="alert" className="text-muted-foreground">{error.message}</p><Button asChild variant="outline"><Link to="/painel">Voltar ao financeiro</Link></Button></main>,
  notFoundComponent: () => <main className="p-6">Solicitação não encontrada.</main>,
  component: ConsentPage,
});

function ConsentPage() {
  const details = Route.useLoaderData();
  const { authorization_id } = Route.useSearch();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function decide(approve: boolean) {
    setBusy(true); setError("");
    try {
      const result = approve
        ? await supabase.auth.oauth.approveAuthorization(authorization_id, { skipBrowserRedirect: true })
        : await supabase.auth.oauth.denyAuthorization(authorization_id, { skipBrowserRedirect: true });
      if (result.error) throw result.error;
      const target = result.data?.redirect_url;
      if (!target) throw new Error("Não foi possível retornar ao assistente. Inicie a conexão novamente.");
      window.location.assign(target);
    } catch {
      setError("Não foi possível concluir a autorização. Tente novamente ou reinicie a conexão pelo assistente.");
      setBusy(false);
    }
  }
  return <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-5 px-6 py-12">
    <ShieldCheck className="size-10 text-primary" />
    <p className="text-sm font-semibold text-muted-foreground">UPSYSTEM FINCONTROL</p>
    <h1 className="text-2xl font-bold">Conectar {details.client.name || "assistente"}?</h1>
    <p className="text-muted-foreground">Ao autorizar, este assistente poderá consultar clientes, contratos, títulos financeiros e o histórico de cobranças Efí da sua conta, incluindo nomes, documentos e valores.</p>
    <p className="text-sm text-muted-foreground">Esta integração não permite alterar cadastros, apagar registros ou emitir cobranças. Autorize apenas assistentes em que você confia.</p>
    {error && <p role="alert" className="text-danger">{error}</p>}
    <div className="flex gap-3"><Button disabled={busy} onClick={() => void decide(true)}>{busy && <Loader2 className="size-4 animate-spin" />}Autorizar</Button><Button disabled={busy} variant="outline" onClick={() => void decide(false)}>Recusar</Button></div>
  </main>;
}
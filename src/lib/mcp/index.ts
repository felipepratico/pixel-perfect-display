import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listCustomers from "./tools/list-customers";
import listTitles from "./tools/list-titles";
import listEfiBilling from "./tools/list-efi-billing";

const projectRef = import.meta.env['VITE_SUPABASE_PROJECT_ID'] ?? "project-ref-unset";

export default defineMcp({
  name: "upsystem-fincontrol",
  title: "UPSYSTEM FINCONTROL",
  version: "1.0.0",
  instructions: "Consultas somente leitura de clientes, títulos financeiros e histórico Efí da conta autorizada. Valores em reais (BRL). Use filtros e paginação. O status Efí é o último status salvo, não uma consulta ao banco em tempo real. Nenhuma ferramenta emite cobranças, altera registros ou revela credenciais.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listCustomers, listTitles, listEfiBilling],
});

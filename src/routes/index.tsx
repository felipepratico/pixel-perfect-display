import { createFileRoute, redirect } from "@tanstack/react-router";
import { CloudCheck, FileSpreadsheet, Repeat, ShieldCheck, Wallet } from "lucide-react";

export const Route = createFileRoute("/")({
  beforeLoad: () => {
    throw redirect({ to: "/auth" });
  },
  head: () => ({
    meta: [
      { title: "FinControl Cloud — Contas a receber e assinaturas" },
      {
        name: "description",
        content:
          "Controle mensalidades de site, assinaturas recorrentes, lucros e cobranças em um painel único salvo na nuvem.",
      },
      { property: "og:title", content: "FinControl Cloud — Contas a receber e assinaturas" },
      {
        property: "og:description",
        content:
          "Controle mensalidades de site, assinaturas recorrentes, lucros e cobranças em um painel único salvo na nuvem.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => null,
});

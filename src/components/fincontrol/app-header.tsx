import { Link, useNavigate } from "@tanstack/react-router";
import {
  Banknote,
  CloudCheck,
  FileClock,
  LogOut,
  MonitorCog,
  ShieldAlert,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

const items = [
  { to: "/painel", label: "Financeiro", icon: Banknote },
  { to: "/clientes", label: "Clientes", icon: Users },
  { to: "/operacao", label: "Operação", icon: MonitorCog },
  { to: "/monitoramento", label: "Monitoramento", icon: ShieldAlert },
  { to: "/auditoria", label: "Auditoria", icon: FileClock },
  { to: "/cobrancas-efi", label: "Cobranças Efí", icon: CloudCheck },
] as const;

export function AppHeader() {
  const navigate = useNavigate();
  return (
    <header className="bg-shell text-shell-foreground print:hidden">
      <div className="flex w-full flex-col gap-3 px-3 py-3 sm:px-4 sm:py-4 lg:flex-row lg:items-center lg:justify-between">
        <Link to="/painel" className="flex items-center gap-3 font-extrabold">
          <span className="rounded-lg bg-brand p-2 text-brand-foreground">
            <CloudCheck className="size-5" />
          </span>
          UPSYSTEM FINCONTROL
        </Link>
        <nav
          className="scroll-slim flex gap-1 overflow-x-auto pb-1 lg:pb-0"
          aria-label="Áreas do sistema"
        >
          {items.map(({ to, label, icon: Icon }) => (
            <Button
              key={to}
              asChild
              size="sm"
              variant="ghost"
              className="shrink-0 text-shell-foreground hover:bg-shell-foreground/10 hover:text-shell-foreground"
            >
              <Link to={to} activeProps={{ className: "bg-shell-foreground/15" }}>
                <Icon className="size-4" />
                {label}
              </Link>
            </Button>
          ))}
          <Button
            size="icon"
            variant="ghost"
            className="shrink-0 text-shell-foreground hover:bg-shell-foreground/10 hover:text-shell-foreground"
            title="Sair"
            onClick={async () => {
              await supabase.auth.signOut();
              void navigate({ to: "/auth" });
            }}
          >
            <LogOut className="size-4" />
          </Button>
        </nav>
      </div>
    </header>
  );
}

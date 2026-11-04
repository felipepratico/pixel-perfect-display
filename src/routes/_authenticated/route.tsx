import { createFileRoute, Link, Outlet, redirect } from "@tanstack/react-router";
import { CloudCheck } from "lucide-react";

import { AppSidebar } from "@/components/fincontrol/app-sidebar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const { user } = Route.useRouteContext();

  return (
    <SidebarProvider>
      <AppSidebar email={user.email} />
      <div className="flex min-h-svh min-w-0 flex-1 flex-col">
        {/* Barra superior apenas no mobile: abre a sidebar em um drawer. */}
        <header className="sticky top-0 z-20 flex items-center gap-2 border-b border-border/60 bg-shell/95 px-3 py-2 text-shell-foreground backdrop-blur md:hidden print:hidden">
          <SidebarTrigger
            title="Abrir menu"
            aria-label="Abrir menu lateral"
            className="text-shell-foreground hover:bg-shell-foreground/10 hover:text-shell-foreground"
          />
          <Link to="/painel" className="flex items-center gap-2 text-sm font-extrabold">
            <span className="grid size-7 place-items-center rounded-lg bg-sidebar-highlight text-sidebar-highlight-foreground">
              <CloudCheck className="size-4" />
            </span>
            UPSYSTEM FINCONTROL
          </Link>
        </header>
        <Outlet />
      </div>
    </SidebarProvider>
  );
}

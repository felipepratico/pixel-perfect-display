import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  CalendarPlus,
  ChevronRight,
  CloudCheck,
  Download,
  FileSearch,
  FileText,
  LogOut,
  MonitorCog,
  PanelLeftClose,
  PanelLeftOpen,
  Repeat,
  ShieldAlert,
  Upload,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

const menuItems: {
  to: "/clientes" | "/operacao" | "/monitoramento" | "/auditoria";
  label: string;
  icon: LucideIcon;
}[] = [
  { to: "/clientes", label: "Clientes", icon: Users },
  { to: "/operacao", label: "Operação", icon: MonitorCog },
  { to: "/monitoramento", label: "Monitoramento", icon: ShieldAlert },
  { to: "/auditoria", label: "Auditoria", icon: FileSearch },
];

const botaoMenu =
  "h-9 gap-2.5 rounded-lg px-2.5 text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-[active=true]:bg-sidebar-highlight data-[active=true]:font-semibold data-[active=true]:text-sidebar-highlight-foreground data-[state=open]:hover:bg-sidebar-accent data-[state=open]:hover:text-sidebar-accent-foreground group-data-[collapsible=icon]:mx-auto";

const botaoSubmenu =
  "h-8 gap-2 rounded-md pl-2.5 text-[13px] text-sidebar-foreground/65 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-[active=true]:bg-sidebar-highlight data-[active=true]:font-semibold data-[active=true]:text-sidebar-highlight-foreground";

type AppSidebarProps = {
  email?: string | null | undefined;
};

export function AppSidebar({ email }: AppSidebarProps) {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const { isMobile, open, openMobile, setOpen, setOpenMobile } = useSidebar();
  const aberto = isMobile ? openMobile : open;

  const financeiroAtivo = pathname === "/painel" || pathname === "/cobrancas-efi";
  const [financeiroAberto, setFinanceiroAberto] = useState(financeiroAtivo);

  useEffect(() => {
    if (financeiroAtivo) setFinanceiroAberto(true);
  }, [financeiroAtivo]);

  function aoAlternarFinanceiro(abrir: boolean) {
    if (!isMobile && !open) {
      // No modo recolhido, clicar em Financeiro expande a sidebar e o submenu.
      setOpen(true);
      setFinanceiroAberto(true);
      return;
    }
    setFinanceiroAberto(abrir);
  }

  function fecharNoMobile() {
    if (isMobile) setOpenMobile(false);
  }

  async function sair() {
    await supabase.auth.signOut();
    void navigate({ to: "/auth" });
  }

  const inicial = email?.trim().charAt(0).toUpperCase() || "U";

  return (
    <div className="print:hidden">
      <Sidebar collapsible="icon">
        <SidebarHeader className="gap-2 border-b border-sidebar-border/70 p-2.5">
          <div className="flex items-center gap-2 group-data-[collapsible=icon]:flex-col group-data-[collapsible=icon]:gap-1.5">
            <Link
              to="/painel"
              onClick={fecharNoMobile}
              className="flex min-w-0 flex-1 items-center gap-2.5 group-data-[collapsible=icon]:flex-none"
            >
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-sidebar-highlight text-sidebar-highlight-foreground shadow-lg shadow-sidebar-highlight/30">
                <CloudCheck className="size-5" />
              </span>
              <span className="min-w-0 leading-tight group-data-[collapsible=icon]:hidden">
                <span className="block truncate text-sm font-extrabold tracking-tight">
                  UPSYSTEM
                </span>
                <span className="block truncate text-[10px] font-semibold uppercase tracking-[0.2em] text-sidebar-foreground/50">
                  Fincontrol
                </span>
              </span>
            </Link>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => (isMobile ? setOpenMobile(false) : setOpen(!open))}
              title={isMobile ? "Fechar menu" : aberto ? "Recolher menu" : "Expandir menu"}
              aria-label={
                isMobile
                  ? "Fechar menu lateral"
                  : aberto
                    ? "Recolher menu lateral"
                    : "Expandir menu lateral"
              }
              aria-expanded={aberto}
              className="size-8 shrink-0 rounded-lg text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground"
            >
              {aberto ? (
                <PanelLeftClose className="size-4" />
              ) : (
                <PanelLeftOpen className="size-4" />
              )}
            </Button>
          </div>
        </SidebarHeader>

        <SidebarContent className="scroll-slim">
          <SidebarGroup>
            <SidebarGroupLabel className="text-[11px] font-bold uppercase tracking-[0.16em] text-sidebar-foreground/40">
              Navegação
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <Collapsible open={financeiroAberto} onOpenChange={aoAlternarFinanceiro}>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton
                        isActive={financeiroAtivo}
                        tooltip="Financeiro"
                        className={cn(
                          botaoMenu,
                          financeiroAberto && !financeiroAtivo && "bg-sidebar-accent",
                        )}
                      >
                        <Wallet className="size-4" />
                        <span>Financeiro</span>
                        <ChevronRight
                          className={cn(
                            "ml-auto size-4 shrink-0 text-sidebar-foreground/40 transition-transform duration-200 group-data-[collapsible=icon]:hidden",
                            financeiroAberto && "rotate-90",
                          )}
                        />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
                      <SidebarMenuSub>
                        <SidebarMenuSubItem>
                          <SidebarMenuSubButton asChild className={botaoSubmenu}>
                            <Link
                              to="/painel"
                              search={{ acao: "assinaturas" }}
                              onClick={fecharNoMobile}
                            >
                              <Repeat className="size-3.5" />
                              <span>Assinaturas</span>
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                        <SidebarMenuSubItem>
                          <SidebarMenuSubButton asChild className={botaoSubmenu}>
                            <Link
                              to="/painel"
                              search={{ acao: "gerar-meses" }}
                              onClick={fecharNoMobile}
                            >
                              <CalendarPlus className="size-3.5" />
                              <span>Gerar meses</span>
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                        <SidebarMenuSubItem>
                          <SidebarMenuSubButton
                            asChild
                            isActive={pathname === "/cobrancas-efi"}
                            className={botaoSubmenu}
                          >
                            <Link to="/cobrancas-efi" onClick={fecharNoMobile}>
                              <CloudCheck className="size-3.5" />
                              <span>Cobranças Efí</span>
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                        <SidebarMenuSubItem>
                          <SidebarMenuSubButton asChild className={botaoSubmenu}>
                            <Link
                              to="/painel"
                              search={{ acao: "importar" }}
                              onClick={fecharNoMobile}
                            >
                              <Upload className="size-3.5" />
                              <span>Importar</span>
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                        <SidebarMenuSubItem>
                          <SidebarMenuSubButton asChild className={botaoSubmenu}>
                            <Link
                              to="/painel"
                              search={{ acao: "exportar" }}
                              onClick={fecharNoMobile}
                            >
                              <Download className="size-3.5" />
                              <span>Exportar</span>
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                        <SidebarMenuSubItem>
                          <SidebarMenuSubButton asChild className={botaoSubmenu}>
                            <Link
                              to="/painel"
                              search={{ acao: "relatorios" }}
                              onClick={fecharNoMobile}
                            >
                              <FileText className="size-3.5" />
                              <span>Relatórios</span>
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </Collapsible>
                </SidebarMenuItem>

                {menuItems.map(({ to, label, icon: Icon }) => (
                  <SidebarMenuItem key={to}>
                    <SidebarMenuButton
                      asChild
                      isActive={pathname === to}
                      tooltip={label}
                      className={botaoMenu}
                    >
                      <Link to={to} onClick={fecharNoMobile}>
                        <Icon className="size-4" />
                        <span>{label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarSeparator />
        <SidebarFooter className="gap-2 p-2.5">
          <div className="flex items-center gap-2.5 group-data-[collapsible=icon]:flex-col group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:gap-1.5">
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-sidebar-highlight text-xs font-bold uppercase text-sidebar-highlight-foreground">
              {inicial}
            </span>
            <div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
              <p className="truncate text-xs font-semibold text-sidebar-foreground">Conta</p>
              <p className="truncate text-[11px] text-sidebar-foreground/50">{email || "—"}</p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={sair}
              title="Sair"
              aria-label="Sair"
              className="size-8 shrink-0 rounded-lg text-sidebar-foreground/60 hover:bg-red-50 hover:text-red-600"
            >
              <LogOut className="size-4" />
            </Button>
          </div>
        </SidebarFooter>
      </Sidebar>
    </div>
  );
}

import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  CalendarPlus,
  ChevronDown,
  ChevronRight,
  CloudCheck,
  Download,
  FileSearch,
  FileText,
  LogOut,
  MonitorCog,
  PanelLeftClose,
  PanelLeftOpen,
  Receipt,
  Repeat,
  Settings,
  ShieldAlert,
  Upload,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useState } from "react";

import { FullscreenToggle } from "@/components/fincontrol/fullscreen-toggle";
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
  "h-9 gap-2.5 rounded-lg px-2.5 text-slate-600 transition-all duration-300 ease-in-out hover:bg-slate-100 hover:text-slate-900 hover:translate-x-1 active:scale-95 data-[active=true]:bg-slate-100 data-[active=true]:font-semibold data-[active=true]:text-slate-800 data-[state=open]:hover:bg-slate-100 data-[state=open]:hover:text-slate-900 group-data-[collapsible=icon]:mx-auto";

const botaoSubmenu =
  "h-8 gap-2 rounded-md pl-2.5 text-[13px] text-slate-500 transition-all duration-300 ease-in-out hover:bg-slate-100 hover:text-slate-900 hover:translate-x-1 active:scale-95 data-[active=true]:bg-slate-100 data-[active=true]:font-semibold data-[active=true]:text-slate-800";

type AppSidebarProps = {
  email?: string | null | undefined;
};

export function AppSidebar({ email }: AppSidebarProps) {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const { isMobile, open, openMobile, setOpen, setOpenMobile } = useSidebar();
  const aberto = isMobile ? openMobile : open;

  const financeiroAtivo =
    pathname === "/painel" ||
    pathname === "/cobrancas-efi" ||
    pathname === "/recebimentos-assinatura";
  const configuracoesAtivo = pathname === "/configuracoes";
  const [financeiroAberto, setFinanceiroAberto] = useState(financeiroAtivo);
  const [configuracoesAberto, setConfiguracoesAberto] = useState(configuracoesAtivo);
  const [relatoriosAberto, setRelatoriosAberto] = useState(pathname === "/recebimentos-assinatura");

  useEffect(() => {
    if (financeiroAtivo) setFinanceiroAberto(true);
    if (configuracoesAtivo) setConfiguracoesAberto(true);
    if (pathname === "/recebimentos-assinatura") setRelatoriosAberto(true);
  }, [financeiroAtivo, configuracoesAtivo, pathname]);

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
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-white text-[#0f4c9c] shadow-lg shadow-black/20">
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
              className="size-8 shrink-0 rounded-lg border border-slate-200 bg-white text-slate-700 transition-all duration-300 ease-in-out hover:bg-slate-50 hover:text-slate-900 active:scale-95"
            >
              {aberto ? (
                <PanelLeftClose className="size-4 text-slate-700" />
              ) : (
                <PanelLeftOpen className="size-4 text-slate-700" />
              )}
            </Button>
            <FullscreenToggle />
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
                        <Wallet className="size-4 transition-transform duration-300 ease-in-out" />
                        <span>Financeiro</span>
                        <ChevronDown
                          className={cn(
                            "ml-auto size-4 shrink-0 text-sidebar-foreground/60 transition-transform duration-300 ease-in-out group-data-[collapsible=icon]:hidden",
                            financeiroAberto && "rotate-180",
                          )}
                        />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="overflow-hidden origin-top data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
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
                          <Collapsible open={relatoriosAberto} onOpenChange={setRelatoriosAberto}>
                            <CollapsibleTrigger asChild>
                              <SidebarMenuSubButton className={botaoSubmenu}>
                                <FileText className="size-3.5" />
                                <span>Relatórios</span>
                                <ChevronDown
                                  className={cn(
                                    "ml-auto size-3.5 shrink-0 text-sidebar-foreground/60 transition-transform duration-300 ease-in-out",
                                    relatoriosAberto && "rotate-180",
                                  )}
                                />
                              </SidebarMenuSubButton>
                            </CollapsibleTrigger>
                            <CollapsibleContent className="overflow-hidden origin-top data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
                              <SidebarMenuSub className="ml-3 border-l border-sidebar-border/60 pl-1">
                                <SidebarMenuSubItem>
                                  <SidebarMenuSubButton asChild className={botaoSubmenu}>
                                    <Link
                                      to="/painel"
                                      search={{ acao: "relatorios" }}
                                      onClick={fecharNoMobile}
                                    >
                                      <FileText className="size-3.5" />
                                      <span>Relatório do cliente</span>
                                    </Link>
                                  </SidebarMenuSubButton>
                                </SidebarMenuSubItem>
                                <SidebarMenuSubItem>
                                  <SidebarMenuSubButton
                                    asChild
                                    isActive={pathname === "/recebimentos-assinatura"}
                                    className={botaoSubmenu}
                                  >
                                    <Link to="/recebimentos-assinatura" onClick={fecharNoMobile}>
                                      <Receipt className="size-3.5" />
                                      <span>Recebimentos de Assinatura</span>
                                    </Link>
                                  </SidebarMenuSubButton>
                                </SidebarMenuSubItem>
                              </SidebarMenuSub>
                            </CollapsibleContent>
                          </Collapsible>
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
                <SidebarMenuItem>
                  <Collapsible open={configuracoesAberto} onOpenChange={setConfiguracoesAberto}>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton
                        isActive={configuracoesAtivo}
                        tooltip="Configurações"
                        className={cn(
                          botaoMenu,
                          configuracoesAberto && !configuracoesAtivo && "bg-sidebar-accent",
                        )}
                      >
                        <Settings className="size-4 transition-transform duration-300 ease-in-out" />
                        <span>Configurações</span>
                        <ChevronDown
                          className={cn(
                            "ml-auto size-4 shrink-0 text-sidebar-foreground/60 transition-transform duration-300 ease-in-out group-data-[collapsible=icon]:hidden",
                            configuracoesAberto && "rotate-180",
                          )}
                        />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="overflow-hidden origin-top data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
                      <SidebarMenuSub>
                        <SidebarMenuSubItem>
                          <SidebarMenuSubButton
                            asChild
                            isActive={pathname === "/configuracoes"}
                            className={botaoSubmenu}
                          >
                            <Link to="/configuracoes" onClick={fecharNoMobile}>
                              <Settings className="size-3.5" />
                              <span>Taxas Assinatura / Boleto</span>
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </Collapsible>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarSeparator />
        <SidebarFooter className="gap-2 p-2.5">
          <div className="flex items-center gap-2.5 group-data-[collapsible=icon]:flex-col group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:gap-1.5">
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-white text-xs font-bold uppercase text-[#0f4c9c]">
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
              className="size-8 shrink-0 rounded-lg border border-slate-200 bg-white text-slate-700 transition-all duration-300 ease-in-out hover:bg-slate-50 hover:text-slate-900 active:scale-95"
            >
              <LogOut className="size-4 text-slate-700" />
            </Button>
          </div>
        </SidebarFooter>
      </Sidebar>
    </div>
  );
}

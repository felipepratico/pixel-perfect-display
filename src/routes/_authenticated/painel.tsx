import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  CalendarPlus,
  CheckCircle2,
  CloudCheck,
  Download,
  Eye,
  EyeOff,
  FileText,
  Filter,
  Loader2,
  LogOut,
  MessageCircle,
  Plus,
  Printer,
  Receipt,
  Repeat,
  Sparkles,
  Trash2,
  Upload,
  Clock,
} from "lucide-react";
import { useMemo, useState, useEffect } from "react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import { AssinaturasDialog } from "@/components/fincontrol/assinaturas-dialog";
import { CobrancaLoteDialog } from "@/components/fincontrol/cobranca-lote-dialog";
import { Filtros, type FiltrosState } from "@/components/fincontrol/filtros";
import { GeminiInsightsDialog } from "@/components/fincontrol/gemini-insights-dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Graficos } from "@/components/fincontrol/graficos";
import { ImportDialog } from "@/components/fincontrol/import-dialog";
import { AreaImpressao } from "@/components/fincontrol/impressao";
import { KpiCards } from "@/components/fincontrol/kpi-cards";
import { CardAdimplencia } from "@/components/fincontrol/card-adimplencia";
import {
  MarcarComoPagoDialog,
  type FormaPagamento,
} from "@/components/fincontrol/marcar-como-pago-dialog";
import {
  NovaAssinaturaDialog,
  type NovaAssinaturaValues,
} from "@/components/fincontrol/nova-assinatura-dialog";
import { RecorrenciaDialog } from "@/components/fincontrol/recorrencia-dialog";
import { RelatorioDialog } from "@/components/fincontrol/relatorio-dialog";
import { TituloDialog } from "@/components/fincontrol/titulo-dialog";
import { TitulosTable } from "@/components/fincontrol/titulos-table";
import { WhatsAppDialog } from "@/components/fincontrol/whatsapp-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { emptyCliente, type Cliente } from "@/lib/clientes";
import { exportTitulos } from "@/lib/excel";
import {
  chaveClienteDoTitulo,
  chaveDoCliente,
  clienteIdDoTitulo,
  computeRow,
  currentMesAno,
  emptyTitulo,
  formatCurrency,
  getDiasVencido,
  isActiveSubscription,
  isTituloAVencer,
  isTituloVencido,
  mesAnoRank,
  normalizeMesAno,
  shiftMesAno,
  tituloDeClienteAtivo,
  type Titulo,
  type TituloInput,
} from "@/lib/fincontrol";
import { valorContrato } from "@/lib/clientes";
import { calcularTotais } from "@/lib/totais";
import {
  buscarConfiguracaoFinanceira,
  type ConfiguracoesFinanceiras,
} from "@/lib/configuracoes-financeiras";
import { useClienteMutations, useClientes } from "@/lib/use-clientes";
import { useTituloMutations, useTitulos } from "@/lib/use-titulos";

export const Route = createFileRoute("/_authenticated/painel")({
  validateSearch: (search: Record<string, unknown>): { acao?: string | undefined } => ({
    acao: typeof search["acao"] === "string" ? search["acao"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Painel — UPSYSTEM FINCONTROL" },
      {
        name: "description",
        content: "Painel de contas a receber, lucros e assinaturas recorrentes.",
      },
      { property: "og:title", content: "Painel — UPSYSTEM FINCONTROL" },
      {
        property: "og:description",
        content: "Painel de contas a receber, lucros e assinaturas recorrentes.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Painel,
});

const erro = (e: unknown) => {
  const err = e as
    { message?: string; details?: string; hint?: string; code?: string } | null | undefined;
  const mensagem = err?.message ?? (e instanceof Error ? e.message : "Algo deu errado.");
  const detalhes = err?.details;
  toast.error(detalhes ? `${mensagem}\nDetalhes: ${detalhes}` : mensagem);
};

function Painel() {
  const navigate = useNavigate();
  const { acao } = Route.useSearch();
  const { data: todos = [], isLoading } = useTitulos();
  const { data: clientesCadastrados = [] } = useClientes();
  const { saveTitulo, insertMany, patchMany, removeMany } = useTituloMutations();
  const { saveCliente, patchCliente } = useClienteMutations();

  const [filtros, setFiltros] = useState<FiltrosState>({
    busca: "",
    status: "all",
    mesAno: currentMesAno(),
    vencimento: "all",
    mensagemSistema: "all",
    ordenacao: "clienteAsc",
  });
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [editando, setEditando] = useState<Titulo | null>(null);
  const [tituloOpen, setTituloOpen] = useState(false);
  const [whats, setWhats] = useState<Titulo | null>(null);
  const [assOpen, setAssOpen] = useState(false);
  const [novaAssOpen, setNovaAssOpen] = useState(false);
  const [novaAssClienteInicial, setNovaAssClienteInicial] = useState<Cliente | null>(null);
  const [recOpen, setRecOpen] = useState(false);
  const [impOpen, setImpOpen] = useState(false);
  const [relOpen, setRelOpen] = useState(false);
  const [relCliente, setRelCliente] = useState<string | null>(null);
  const [loteOpen, setLoteOpen] = useState(false);
  const [valoresVisiveis, setValoresVisiveis] = useState(true);
  const [geminiOpen, setGeminiOpen] = useState(false);
  const [confirmarPago, setConfirmarPago] = useState<{
    ids: string[];
    nomes?: string[];
  } | null>(null);
  const [marcarPagoOpen, setMarcarPagoOpen] = useState(false);
  const [marcarPagoTitulos, setMarcarPagoTitulos] = useState<Titulo[]>([]);
  const [config, setConfig] = useState<ConfiguracoesFinanceiras | null>(null);
  const [impressao, setImpressao] = useState<{ titulos: Titulo[]; subtitulo: string } | null>(null);

  useEffect(() => {
    buscarConfiguracaoFinanceira().then(setConfig);
  }, []);

  function imprimir(lista: Titulo[], subtitulo: string) {
    if (!lista.length) {
      toast.info("Nada para imprimir com os filtros atuais.");
      return;
    }
    setImpressao({ titulos: lista, subtitulo });
    setTimeout(() => window.print(), 120);
  }

  const titulosVencidos = useMemo(
    () => todos.filter(isTituloVencido).map((t) => ({ ...t, diasAtraso: getDiasVencido(t) })),
    [todos],
  );

  const countAVencer = useMemo(() => todos.filter(isTituloAVencer).length, [todos]);

  // Mês atual + histórico contínuo de meses anteriores. Também mantém meses futuros
  // que já existam nos dados (ex.: gerados por recorrência) para não esconder títulos.
  const mesesDisponiveis = useMemo(() => {
    const atualRank = mesAnoRank(currentMesAno()) ?? 0;
    let menorRank = atualRank;
    let maiorRank = atualRank;

    for (const titulo of todos) {
      const rank = mesAnoRank(titulo.mes_ano);
      if (rank === null) continue;
      if (rank < menorRank) menorRank = rank;
      if (rank > maiorRank) maiorRank = rank;
    }

    const meses: string[] = [];
    for (let rank = maiorRank; rank >= menorRank; rank -= 1) {
      const mes = ((rank - 1) % 12) + 1;
      const ano = Math.floor((rank - 1) / 12);
      meses.push(`${String(mes).padStart(2, "0")}/${ano}`);
    }
    return meses;
  }, [todos]);

  const filtrados = useMemo(() => {
    const busca = filtros.busca.trim().toUpperCase();
    const codigoSitePorCliente = new Map(clientesCadastrados.map((c) => [c.id, c.codigo_site]));
    const mensagemSistemaPorCliente = new Map(
      clientesCadastrados.map((c) => [c.id, (c.mensagem_sistema ?? "Normal") || "Normal"]),
    );
    const list = todos.filter((t) => {
      if (busca && !t.cliente.toUpperCase().includes(busca) && !t.cnpj.includes(busca)) {
        if (!t.cliente_id || !codigoSitePorCliente.get(t.cliente_id)?.toUpperCase().includes(busca))
          return false;
      }
      if (filtros.status === "VENCIDO") {
        if (!isTituloVencido(t)) return false;
      } else if (filtros.status === "AVENCER") {
        if (!isTituloAVencer(t)) return false;
      } else if (filtros.status === "RECORRENTE") {
        if (!isActiveSubscription(t)) return false;
      } else if (filtros.status !== "all" && t.situacao !== filtros.status) {
        return false;
      }
      if (filtros.mesAno && filtros.mesAno !== "all" && t.mes_ano !== filtros.mesAno) return false;
      if (
        filtros.vencimento &&
        filtros.vencimento !== "all" &&
        String(t.vencimento) !== filtros.vencimento
      )
        return false;
      if (filtros.mensagemSistema && filtros.mensagemSistema !== "all") {
        const msg = mensagemSistemaPorCliente.get(t.cliente_id ?? "") ?? "Normal";
        if (msg !== filtros.mensagemSistema) return false;
      }
      return true;
    });
    return list.sort((a, b) => {
      switch (filtros.ordenacao) {
        case "vencimentoAsc":
          return a.vencimento - b.vencimento;
        case "lucroFelipeDesc":
          return computeRow(b).lucroFelipe - computeRow(a).lucroFelipe;
        case "mensalSiteDesc":
          return b.mensal_site - a.mensal_site;
        default:
          return a.cliente.localeCompare(b.cliente);
      }
    });
  }, [todos, filtros, clientesCadastrados]);

  const clientesVisiveis = filtrados;

  // Ações disparadas pelos subitens da sidebar (ex.: /painel?acao=assinaturas).
  useEffect(() => {
    if (!acao) return;

    if (acao === "exportar") {
      // Aguarda o carregamento antes de exportar, senão o arquivo sairia vazio.
      if (isLoading) return;
      if (clientesVisiveis.length) {
        exportTitulos(clientesVisiveis);
      } else {
        toast.info("Nada para exportar com os filtros atuais.");
      }
    } else if (acao === "assinaturas") {
      setAssOpen(true);
    } else if (acao === "gerar-meses") {
      setRecOpen(true);
    } else if (acao === "importar") {
      setImpOpen(true);
    } else if (acao === "relatorios") {
      setRelCliente(null);
      setRelOpen(true);
    }
    void navigate({ to: "/painel", search: {}, replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [acao, isLoading]);

  const totais = useMemo(
    () => calcularTotais(clientesVisiveis, todos, clientesCadastrados),
    [clientesVisiveis, todos, clientesCadastrados],
  );

  const moeda = (valor: number) => (valoresVisiveis ? formatCurrency(valor) : "R$ ••••••");

  /** Mês de referência dos indicadores de clientes (respeita o filtro do painel). */
  const mesReferencia =
    filtros.mesAno && filtros.mesAno !== "all" ? filtros.mesAno : currentMesAno();

  // Indicadores secundários usados no accordion de gráficos.
  const pontualidade = totais.quantidade > 0 ? (totais.pagos / totais.quantidade) * 100 : 0;

  const mediaAtraso = useMemo(() => {
    const vencidos = clientesVisiveis.filter(isTituloVencido);
    if (!vencidos.length) return 0;
    const soma = vencidos.reduce((acc, t) => acc + (getDiasVencido(t) ?? 0), 0);
    return soma / vencidos.length;
  }, [clientesVisiveis]);

  const arpu = totais.assinaturasAtivas > 0 ? totais.mrr / totais.assinaturasAtivas : 0;

  function onSave(values: TituloInput, id?: string) {
    saveTitulo.mutate(id ? { id, values } : { values }, {
      onSuccess: () => {
        toast.success("Lançamento salvo.");
        setTituloOpen(false);
      },
      onError: erro,
    });
  }

  async function onNovaAssinatura(values: NovaAssinaturaValues) {
    try {
      const cnpjDigitos = values.cnpj.replace(/\D/g, "");
      const clienteEncontrado =
        (values.clienteId
          ? clientesCadastrados.find((cliente) => cliente.id === values.clienteId)
          : undefined) ??
        clientesCadastrados.find(
          (cliente) =>
            cliente.razao_social.trim().toUpperCase() === values.cliente.trim().toUpperCase(),
        ) ??
        clientesCadastrados.find(
          (cliente) => cnpjDigitos !== "" && cliente.cnpj.replace(/\D/g, "") === cnpjDigitos,
        );

      let clienteId = clienteEncontrado?.id ?? values.clienteId;
      if (!clienteId) {
        clienteId = await saveCliente.mutateAsync({
          values: {
            ...emptyCliente(),
            razao_social: values.cliente,
            cnpj: values.cnpj,
            telefone: values.telefone.replace(/\D/g, ""),
            valor_base: values.valor,
            vencimento: values.vencimento,
            status: "ATIVO",
            observacoes: "Cliente criado pelo painel de assinaturas recorrentes.",
          },
        });
      }

      await saveTitulo.mutateAsync({
        values: {
          ...emptyTitulo(),
          cliente_id: clienteId,
          cliente: clienteEncontrado?.razao_social ?? values.cliente,
          cnpj: clienteEncontrado?.cnpj ?? values.cnpj,
          telefone: (clienteEncontrado?.telefone ?? values.telefone).replace(/\D/g, ""),
          mensal_site: values.valor,
          mensal_real: values.valor,
          vencimento: values.vencimento,
          mes_ano: values.mesAno,
          tipo_cobranca: "RECORRENTE",
          status_assinatura: values.status,
          situacao: "ABERTO",
        },
      });

      toast.success(
        clienteEncontrado
          ? "Assinatura adicionada ao cliente."
          : "Cliente e assinatura adicionados.",
      );
      setNovaAssOpen(false);
      setAssOpen(true);
    } catch (error) {
      erro(error);
    }
  }

  function abrirNovaAssinatura() {
    setAssOpen(false);
    setNovaAssOpen(true);
  }

  function abrirNovaAssinaturaParaCliente(clienteId: string) {
    const cliente = clientesCadastrados.find((item) => item.id === clienteId);
    if (!cliente) return;
    setNovaAssClienteInicial(cliente);
    setAssOpen(false);
    setNovaAssOpen(true);
  }

  function alterarNovaAssinatura(open: boolean) {
    setNovaAssOpen(open);
    if (!open) {
      setAssOpen(true);
      setNovaAssClienteInicial(null);
    }
  }

  function abrirMarcarComoPago(titulos: Titulo[]) {
    setMarcarPagoTitulos(titulos);
    setMarcarPagoOpen(true);
  }

  async function marcarComoPago(values: {
    ids: string[];
    pagoEm: string;
    formaPagamento: FormaPagamento | null;
    diasAtraso: number;
  }) {
    try {
      await patchMany.mutateAsync({
        ids: values.ids,
        values: {
          situacao: "PAGO",
          pago_em: values.pagoEm,
          forma_pagamento: values.formaPagamento,
          dias_atraso: values.diasAtraso,
        },
      });
      toast.success(
        values.ids.length === 1
          ? "Lançamento baixado como pago com sucesso!"
          : `${values.ids.length} lançamentos baixados como pagos!`,
      );
      setSelecionados((prev) => {
        const next = new Set(prev);
        values.ids.forEach((id) => next.delete(id));
        return next;
      });
      setMarcarPagoOpen(false);
      setMarcarPagoTitulos([]);
    } catch (error) {
      erro(error);
    }
  }

  function onGerar(mesAnoInicial: string, quantidade: number) {
    const mesBase = normalizeMesAno(mesAnoInicial);
    if (!mesBase) {
      toast.error("Informe o mês/ano no formato MM/AAAA.");
      return;
    }

    const base = new Map<string, Titulo>();
    for (const t of todos) {
      if (!isActiveSubscription(t)) continue;
      const chave = chaveClienteDoTitulo(t, clientesCadastrados);
      const atual = base.get(chave);
      // Usa a assinatura mais recente como referência de valor e vencimento.
      if (!atual || (mesAnoRank(t.mes_ano) ?? 0) > (mesAnoRank(atual.mes_ano) ?? 0)) {
        base.set(chave, t);
      }
    }
    const existentes = new Set(
      todos.map((t) => {
        const mes = normalizeMesAno(t.mes_ano) ?? t.mes_ano;
        return `${chaveClienteDoTitulo(t, clientesCadastrados)}|${mes}`;
      }),
    );
    // Sincronização automática: clientes ATIVOS do cadastro sem nenhum título
    // recorrente (ainda não são assinaturas com título) entram na geração
    // usando mensalidade do contrato (valorContrato) e dia de vencimento do
    // cadastro. Clientes com título cancelado permanecem fora, por decisão
    // explícita do usuário no painel Assinaturas.
    const chavesComTitulo = new Set(
      todos
        .filter((t) => t.tipo_cobranca === "RECORRENTE")
        .map((t) => chaveClienteDoTitulo(t, clientesCadastrados)),
    );
    const linhasVirtuais = clientesCadastrados.filter(
      (c) => c.status === "ATIVO" && !chavesComTitulo.has(chaveDoCliente(c)),
    );
    const rows: TituloInput[] = [];

    for (let i = 0; i < quantidade; i++) {
      const mes = shiftMesAno(mesBase, i);
      if (!mes) continue;
      for (const t of base.values()) {
        if (existentes.has(`${chaveClienteDoTitulo(t, clientesCadastrados)}|${mes}`)) continue;
        const {
          id: _id,
          deleted_at: _deletedAt,
          efi_status: _efiStatus,
          efi_link_pagamento: _efiLink,
          efi_linha_digitavel: _efiLinha,
          ...rest
        } = t;

        rows.push({
          ...rest,
          cliente_id: clienteIdDoTitulo(rest, clientesCadastrados),
          mes_ano: mes,
          situacao: "ABERTO",
        });
      }
      for (const cliente of linhasVirtuais) {
        const chave = chaveDoCliente(cliente);
        if (existentes.has(`${chave}|${mes}`)) continue;
        rows.push(tituloDeClienteAtivo(cliente, valorContrato(cliente), mes));
      }
    }
    if (!rows.length) {
      toast.info("Nenhuma mensalidade nova para gerar.");
      return;
    }
    insertMany.mutate(rows, {
      onSuccess: (n) => {
        toast.success(`${n} mensalidades geradas.`);
        setRecOpen(false);
      },
      onError: erro,
    });
  }

  /**
   * Gera o título do mês direto a partir da linha "Sem título gerado" no painel
   * de assinaturas, preservando vínculo, valor do contrato e dia de vencimento.
   */
  function gerarTituloDoCliente(clienteId: string) {
    const cliente = clientesCadastrados.find((item) => item.id === clienteId);
    if (!cliente) {
      toast.error("Cliente não encontrado no cadastro.");
      return;
    }
    const titulo = tituloDeClienteAtivo(cliente, valorContrato(cliente), mesReferencia);
    insertMany.mutate([titulo], {
      onSuccess: () =>
        toast.success(`Título de ${mesReferencia} gerado para ${cliente.razao_social}.`),
      onError: erro,
    });
  }

  const ids = [...selecionados];

  const valorAberto = useMemo(
    () => todos.filter((t) => t.situacao === "ABERTO").reduce((acc, t) => acc + t.mensal_site, 0),
    [todos],
  );
  const valorPago = useMemo(
    () => todos.filter((t) => t.situacao === "PAGO").reduce((acc, t) => acc + t.mensal_site, 0),
    [todos],
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Toolbar superior de ações (alinhada com a imagem) */}
      <div className="border-b border-slate-200 bg-white print:hidden">
        <div className="flex w-full flex-wrap items-center justify-between gap-2 px-3 py-2.5 sm:px-4">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              onClick={() => setValoresVisiveis((visivel) => !visivel)}
              aria-pressed={valoresVisiveis}
              className="gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 text-xs font-semibold text-slate-700 transition-all hover:bg-slate-50 hover:text-slate-900"
            >
              {valoresVisiveis ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
              {valoresVisiveis ? "Ocultar valores" : "Mostrar valores"}
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setEditando(null);
                setTituloOpen(true);
              }}
              className="gap-1.5 rounded-lg bg-slate-800 px-3 text-xs font-bold text-white hover:bg-slate-900 shadow-sm"
            >
              <Plus className="size-3.5" />
              Lançamento
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setAssOpen(true)}
              className="gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 text-xs font-semibold text-slate-700 transition-all hover:bg-slate-50 hover:text-slate-900"
            >
              <Repeat className="size-3.5" />
              Assinaturas
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setRecOpen(true)}
              className="gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 text-xs font-semibold text-slate-700 transition-all hover:bg-slate-50 hover:text-slate-900"
            >
              <CalendarPlus className="size-3.5" />
              Gerar meses
            </Button>
            <Button
              size="sm"
              variant="outline"
              asChild
              className="gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 text-xs font-semibold text-slate-700 transition-all hover:bg-slate-50 hover:text-slate-900"
            >
              <Link to="/cobrancas-efi">
                <CloudCheck className="size-3.5" />
                Cobranças Efí
              </Link>
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setImpOpen(true)}
              className="gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 text-xs font-semibold text-slate-700 transition-all hover:bg-slate-50 hover:text-slate-900"
            >
              <Upload className="size-3.5" />
              Importar
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={!valoresVisiveis || clientesVisiveis.length === 0}
              onClick={() => exportTitulos(clientesVisiveis)}
              className="gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 text-xs font-semibold text-slate-700 transition-all hover:bg-slate-50 hover:text-slate-900"
            >
              <Download className="size-3.5" />
              Exportar
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 text-xs font-semibold text-slate-700 transition-all hover:bg-slate-50 hover:text-slate-900"
                >
                  <FileText className="size-3.5" />
                  Relatórios
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="text-xs">
                <DropdownMenuItem
                  onSelect={() => {
                    setRelCliente(null);
                    setRelOpen(true);
                  }}
                >
                  <FileText className="size-3.5" />
                  Relatório do cliente
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => void navigate({ to: "/recebimentos-assinatura" })}
                >
                  <Receipt className="size-3.5" />
                  Recebimentos de Assinatura
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              size="sm"
              variant="outline"
              disabled={!valoresVisiveis || clientesVisiveis.length === 0}
              onClick={() =>
                imprimir(
                  clientesVisiveis,
                  `Agrupado por vencimento${filtros.mesAno !== "all" ? ` · ${filtros.mesAno}` : ""}${filtros.status !== "all" ? ` · ${filtros.status}` : ""}`,
                )
              }
              className="gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 text-xs font-semibold text-slate-700 transition-all hover:bg-slate-50 hover:text-slate-900"
            >
              <Printer className="size-3.5" />
              Imprimir
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Botão de destaque do Gemini */}
            <Button
              size="sm"
              onClick={() => setGeminiOpen(true)}
              className="gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 text-xs font-semibold text-slate-700 transition-all hover:bg-slate-50 hover:text-slate-900"
            >
              <Sparkles className="size-3.5 animate-pulse" />
              Gemini IA
              {titulosVencidos.length > 0 && (
                <span className="rounded-full bg-slate-200 px-1.5 py-0.2 text-[10px] font-bold text-slate-700">
                  {titulosVencidos.length}
                </span>
              )}
            </Button>

            <Button
              size="icon"
              variant="outline"
              className="size-8 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900"
              title="Sair"
              onClick={async () => {
                await supabase.auth.signOut();
                void navigate({ to: "/auth" });
              }}
            >
              <LogOut className="size-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Conteúdo Principal organizado conforme a imagem: Cartões -> Gráficos -> Filtros -> Tabela */}
      <main className="w-full space-y-4 px-3 py-4 sm:px-4">
        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* 1. Cartões de KPI (5 principais) */}
            <KpiCards
              totais={totais}
              valoresVisiveis={valoresVisiveis}
              onCobrarVencidos={() => {
                const vencidos = clientesVisiveis.filter((t) => isTituloVencido(t));
                if (!vencidos.length) {
                  toast.info("Nenhum título vencido no período atual.");
                  return;
                }
                setSelecionados(new Set(vencidos.map((t) => t.id)));
                toast.success(
                  `${vencidos.length} vencido(s) selecionado(s). Use "Cobrar no WhatsApp".`,
                );
              }}
            />

            {/* 1.5. Gráficos e indicadores detalhados (recolhível) */}
            <Accordion type="single" collapsible>
              <AccordionItem value="graficos">
                <AccordionTrigger className="flex items-center justify-between">
                  <span className="flex items-center gap-2 font-semibold text-sm">
                    <Clock className="size-4 text-muted-foreground" />
                    Ver gráficos e indicadores detalhados
                  </span>
                </AccordionTrigger>
                <AccordionContent className="space-y-4">
                  {/* Métricas secundárias */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="card-panel p-3 bg-white border border-border/60">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        MRR
                      </p>
                      <p className="text-lg font-black tracking-tight text-foreground">
                        {moeda(totais.mrr)}
                      </p>
                      <p className="text-[11px] text-muted-foreground/75">
                        {totais.assinaturasAtivas} assinatura(s) ativa(s)
                      </p>
                    </div>
                    <div className="card-panel p-3 bg-white border border-border/60">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Pontualidade
                      </p>
                      <p className="text-lg font-black tracking-tight text-foreground">
                        {pontualidade.toFixed(1)}%
                      </p>
                      <p className="text-[11px] text-muted-foreground/75">
                        {totais.pagos} de {totais.quantidade} pagos
                      </p>
                    </div>
                    <div className="card-panel p-3 bg-white border border-border/60">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Média de atraso
                      </p>
                      <p className="text-lg font-black tracking-tight text-foreground">
                        {mediaAtraso.toFixed(1)} dias
                      </p>
                      <p className="text-[11px] text-muted-foreground/75">
                        sobre vencidos em aberto
                      </p>
                    </div>
                    <div className="card-panel p-3 bg-white border border-border/60">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        ARPU
                      </p>
                      <p className="text-lg font-black tracking-tight text-foreground">
                        {moeda(arpu)}
                      </p>
                      <p className="text-[11px] text-muted-foreground/75">
                        receita média por assinatura
                      </p>
                    </div>
                  </div>
                  <CardAdimplencia
                    titulos={todos}
                    clientes={clientesCadastrados}
                    valoresVisiveis={valoresVisiveis}
                  />
                  <Graficos
                    titulos={clientesVisiveis}
                    totais={totais}
                    valoresVisiveis={valoresVisiveis}
                  />
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            {/* 3. Filtros */}
            <Filtros
              state={filtros}
              onChange={(n) => setFiltros((s) => ({ ...s, ...n }))}
              mesesDisponiveis={mesesDisponiveis}
              countAVencer={countAVencer}
              countVencidos={titulosVencidos.length}
            />

            {/* Ações em lote caso haja itens selecionados */}
            {ids.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border/70 bg-card p-3 text-xs">
                <span className="font-semibold text-foreground">{ids.length} selecionado(s)</span>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={() => {
                    const selecionadosList = clientesVisiveis.filter((t) => selecionados.has(t.id));
                    abrirMarcarComoPago(selecionadosList);
                  }}
                >
                  Marcar pago
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={() =>
                    patchMany.mutate({ ids, values: { situacao: "ABERTO" } }, { onError: erro })
                  }
                >
                  Marcar aberto
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 border-emerald-600/40 bg-white text-emerald-700 hover:bg-emerald-50 gap-1 text-xs"
                  onClick={() => setLoteOpen(true)}
                >
                  <MessageCircle className="size-3.5" />
                  Cobrar no WhatsApp
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  disabled={!valoresVisiveis}
                  onClick={() =>
                    imprimir(
                      clientesVisiveis.filter((t) => selecionados.has(t.id)),
                      "Selecionados — agrupado por vencimento",
                    )
                  }
                >
                  <Printer className="size-3.5" />
                  Imprimir seleção
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  className="h-7 text-xs"
                  onClick={() => {
                    if (!confirm(`Excluir ${ids.length} lançamento(s)?`)) return;
                    removeMany.mutate(ids, {
                      onSuccess: () => setSelecionados(new Set()),
                      onError: erro,
                    });
                  }}
                >
                  <Trash2 className="size-3.5" />
                  Excluir
                </Button>
                <span className="ml-auto flex flex-wrap items-center gap-1.5">
                  <select
                    className="h-7 rounded-md border border-border bg-card px-2 text-xs font-semibold"
                    defaultValue=""
                    onChange={(e) => {
                      const dia = Number(e.target.value);
                      if (!Number.isFinite(dia) || dia < 1) return;
                      patchMany.mutate(
                        { ids, values: { vencimento: dia } },
                        {
                          onSuccess: () => toast.success(`Vencimento atualizado para dia ${dia}.`),
                          onError: erro,
                        },
                      );
                    }}
                    aria-label="Alterar vencimento em lote"
                  >
                    <option value="">Alterar vencimento…</option>
                    {[5, 10, 15, 20, 25, 30].map((d) => (
                      <option key={d} value={d}>
                        Dia {d}
                      </option>
                    ))}
                  </select>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    disabled={!valoresVisiveis}
                    onClick={() =>
                      exportTitulos(clientesVisiveis.filter((t) => selecionados.has(t.id)))
                    }
                  >
                    <Download className="size-3.5" />
                    Exportar seleção
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    onClick={() => setLoteOpen(true)}
                  >
                    <CloudCheck className="size-3.5" />
                    Gerar boletos (lote)
                  </Button>
                </span>
              </div>
            )}

            {/* 4. Tabela de Lançamentos */}
            <TitulosTable
              titulos={clientesVisiveis}
              totais={totais}
              valoresVisiveis={valoresVisiveis}
              config={config}
              selecionados={selecionados}
              clientes={clientesCadastrados}
              onToggle={(id) =>
                setSelecionados((s) => {
                  const n = new Set(s);
                  if (n.has(id)) n.delete(id);
                  else n.add(id);
                  return n;
                })
              }
              onToggleTodos={(m) =>
                setSelecionados(m ? new Set(clientesVisiveis.map((t) => t.id)) : new Set())
              }
              onEditar={(t) => {
                setEditando(t);
                setTituloOpen(true);
              }}
              onWhatsApp={setWhats}
              onRelatorio={(t) => {
                setRelCliente(t.cliente);
                setRelOpen(true);
              }}
              onAlternarSituacao={(t) => {
                if (t.situacao !== "PAGO") {
                  abrirMarcarComoPago([t]);
                } else {
                  patchMany.mutate(
                    { ids: [t.id], values: { situacao: "ABERTO" } },
                    { onError: erro },
                  );
                }
              }}
              onExcluir={(t) => {
                if (confirm(`Excluir ${t.cliente}?`)) removeMany.mutate([t.id], { onError: erro });
              }}
              onAlterarMensagemSistema={(clienteId, valor) => {
                patchCliente.mutate(
                  { id: clienteId, values: { mensagem_sistema: valor } },
                  {
                    onSuccess: () => toast.success("Mensagem do sistema atualizada."),
                    onError: erro,
                  },
                );
              }}
            />
          </>
        )}
      </main>

      <TituloDialog
        open={tituloOpen}
        titulo={editando}
        saving={saveTitulo.isPending}
        onOpenChange={setTituloOpen}
        onSave={onSave}
      />
      <AssinaturasDialog
        open={assOpen}
        titulos={todos}
        clientes={clientesCadastrados}
        valoresVisiveis={valoresVisiveis}
        mesAnoReferencia={mesReferencia}
        gerando={insertMany.isPending}
        onOpenChange={setAssOpen}
        onAlternar={(i, ativar) =>
          patchMany.mutate(
            { ids: i, values: { status_assinatura: ativar ? "ATIVO" : "CANCELADO" } },
            { onError: erro },
          )
        }
        onNovaAssinatura={abrirNovaAssinatura}
        onGerarTitulo={gerarTituloDoCliente}
        onCriarAssinaturaParaCliente={abrirNovaAssinaturaParaCliente}
      />
      <NovaAssinaturaDialog
        open={novaAssOpen}
        clientes={clientesCadastrados}
        clienteInicial={novaAssClienteInicial}
        titulos={todos}
        saving={saveCliente.isPending || saveTitulo.isPending}
        onOpenChange={alterarNovaAssinatura}
        onSave={onNovaAssinatura}
      />
      <RecorrenciaDialog
        open={recOpen}
        titulos={todos}
        clientes={clientesCadastrados}
        gerando={insertMany.isPending}
        onOpenChange={setRecOpen}
        onGerar={onGerar}
      />
      <WhatsAppDialog open={!!whats} titulo={whats} onOpenChange={(o) => !o && setWhats(null)} />
      <ImportDialog
        open={impOpen}
        importando={insertMany.isPending}
        onOpenChange={setImpOpen}
        onImportar={(rows) =>
          insertMany.mutate(rows, {
            onSuccess: (n) => {
              toast.success(`${n} lançamentos importados.`);
              setImpOpen(false);
            },
            onError: erro,
          })
        }
      />
      <RelatorioDialog
        open={relOpen}
        titulos={clientesVisiveis}
        clienteInicial={relCliente}
        valoresVisiveis={valoresVisiveis}
        onOpenChange={setRelOpen}
        onImprimir={imprimir}
      />
      <CobrancaLoteDialog
        open={loteOpen}
        titulos={clientesVisiveis.filter((t) => selecionados.has(t.id))}
        valoresVisiveis={valoresVisiveis}
        onOpenChange={setLoteOpen}
      />
      <GeminiInsightsDialog
        open={geminiOpen}
        onOpenChange={setGeminiOpen}
        titulosVencidos={titulosVencidos}
        totalAberto={valorAberto}
        totalPago={valorPago}
        onCobrarWhatsapp={(t) => setWhats(t)}
      />
      <MarcarComoPagoDialog
        open={marcarPagoOpen}
        titulos={marcarPagoTitulos}
        saving={patchMany.isPending}
        onOpenChange={setMarcarPagoOpen}
        onSave={marcarComoPago}
      />
      {impressao ? (
        <AreaImpressao titulos={impressao.titulos} subtitulo={impressao.subtitulo} />
      ) : null}
    </div>
  );
}

import { useServerFn } from "@tanstack/react-start";
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  Copy,
  ExternalLink,
  Key,
  Loader2,
  MessageCircle,
  RefreshCw,
  Send,
  ShieldAlert,
  Sparkles,
  TrendingDown,
  Wand2,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import type { DiagnosticoGemini, MensagemCobrancaGemini, TituloResumo, TomCobranca } from "@/lib/gemini";
import { analisarFinanceiroGemini, gerarCobrancaGemini } from "@/lib/gemini.functions";
import { formatCurrency, normalizePhone, type Titulo } from "@/lib/fincontrol";

const STORAGE_GEMINI_KEY = "fincontrol_gemini_api_key";

export function GeminiInsightsDialog({
  open,
  onOpenChange,
  titulosVencidos,
  totalAberto,
  totalPago,
  onCobrarWhatsapp,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  titulosVencidos: (Titulo & { diasAtraso: number })[];
  totalAberto: number;
  totalPago: number;
  onCobrarWhatsapp?: (titulo: Titulo) => void;
}) {
  const analisar = useServerFn(analisarFinanceiroGemini);
  const gerarCobranca = useServerFn(gerarCobrancaGemini);

  const [apiKey, setApiKey] = useState("");
  const [activeTab, setActiveTab] = useState("diagnostico");
  const [carregandoAnalise, setCarregandoAnalise] = useState(false);
  const [analise, setAnalise] = useState<DiagnosticoGemini | null>(null);

  // Cobrança IA state
  const [clienteSelecionadoId, setClienteSelecionadoId] = useState<string>("");
  const [tomSelecionado, setTomSelecionado] = useState<TomCobranca>("AMIGAVEL");
  const [gerandoMensagem, setGerandoMensagem] = useState(false);
  const [mensagemGerada, setMensagemGerada] = useState<MensagemCobrancaGemini | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedKey = localStorage.getItem(STORAGE_GEMINI_KEY);
      if (savedKey) setApiKey(savedKey);
    }
  }, []);

  useEffect(() => {
    if (open && !analise) {
      void executarAnalise();
    }
    if (open && titulosVencidos.length > 0 && !clienteSelecionadoId) {
      setClienteSelecionadoId(titulosVencidos[0]?.id ?? "");
    }
  }, [open]);

  function salvarApiKey(key: string) {
    setApiKey(key);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_GEMINI_KEY, key.trim());
      toast.success("Chave Gemini salva localmente com sucesso.");
    }
  }

  async function executarAnalise() {
    setCarregandoAnalise(true);
    try {
      const payload: TituloResumo[] = titulosVencidos.map((t) => ({
        id: t.id,
        cliente: t.cliente,
        cnpj: t.cnpj,
        telefone: t.telefone,
        mensal_site: t.mensal_site,
        vencimento: t.vencimento,
        mes_ano: t.mes_ano,
        diasAtraso: t.diasAtraso,
      }));

      const res = await analisar({
        data: {
          titulosVencidos: payload,
          totalAberto,
          totalPago,
          userApiKey: apiKey.trim() || undefined,
        },
      });
      setAnalise(res);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao consultar Gemini.");
    } finally {
      setCarregandoAnalise(false);
    }
  }

  async function handleGerarMensagem() {
    const t = titulosVencidos.find((item) => item.id === clienteSelecionadoId);
    if (!t) {
      toast.error("Selecione um cliente para gerar a cobrança.");
      return;
    }

    setGerandoMensagem(true);
    try {
      const res = await gerarCobranca({
        data: {
          cliente: t.cliente,
          cnpj: t.cnpj,
          telefone: t.telefone,
          valor: t.mensal_site,
          vencimento: `Dia ${t.vencimento} (${t.mes_ano})`,
          diasAtraso: t.diasAtraso,
          tom: tomSelecionado,
          linkPagamento: t.efi_link_pagamento || undefined,
          userApiKey: apiKey.trim() || undefined,
        },
      });
      setMensagemGerada(res);
      toast.success("Mensagem de cobrança formulada pelo Gemini!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao gerar mensagem.");
    } finally {
      setGerandoMensagem(false);
    }
  }

  function handleCopiarTexto(texto: string) {
    void navigator.clipboard.writeText(texto);
    toast.success("Texto copiado para a área de transferência!");
  }

  function handleAbrirWhatsapp() {
    if (!mensagemGerada) return;
    const t = titulosVencidos.find((item) => item.id === clienteSelecionadoId);
    let fone = normalizePhone(t?.telefone ?? "");
    if (!fone) {
      toast.error("O cliente não possui telefone com DDD cadastrado.");
      return;
    }
    if (!fone.startsWith("55") && fone.length <= 11) fone = `55${fone}`;
    window.open(
      `https://api.whatsapp.com/send?phone=${fone}&text=${encodeURIComponent(mensagemGerada.textoWhatsapp)}`,
      "_blank",
      "noopener",
    );
  }

  const selectedTitulo = titulosVencidos.find((t) => t.id === clienteSelecionadoId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto border-brand/20 bg-card p-0 sm:max-w-4xl">
        <div className="border-b bg-gradient-to-r from-brand/15 via-background to-partner/10 p-5">
          <DialogHeader>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-tr from-brand to-primary text-white shadow-lg shadow-brand/20">
                  <Sparkles className="size-5" />
                </span>
                <div>
                  <DialogTitle className="text-xl font-black tracking-tight">
                    UPSYSTEM AI com Google Gemini
                  </DialogTitle>
                  <DialogDescription className="text-xs">
                    Inteligência artificial para recuperação de boletos vencidos, análise de risco e negociação humana.
                  </DialogDescription>
                </div>
              </div>
              <Badge variant="outline" className="border-brand/40 bg-brand/10 text-brand">
                <Bot className="mr-1 size-3" />
                Gemini 2.5 Flash
              </Badge>
            </div>
          </DialogHeader>
        </div>

        <div className="p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-5">
            <TabsList className="grid w-full grid-cols-3 bg-muted/80">
              <TabsTrigger value="diagnostico" className="gap-1.5 text-xs font-bold">
                <ShieldAlert className="size-3.5" />
                Diagnóstico & Inadimplência
              </TabsTrigger>
              <TabsTrigger value="gerador" className="gap-1.5 text-xs font-bold">
                <Wand2 className="size-3.5" />
                Cobrança Inteligente
              </TabsTrigger>
              <TabsTrigger value="configuracoes" className="gap-1.5 text-xs font-bold">
                <Key className="size-3.5" />
                Chave da API Gemini
              </TabsTrigger>
            </TabsList>

            {/* TAB 1: DIAGNÓSTICO */}
            <TabsContent value="diagnostico" className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-extrabold text-sm">Raio-X de Inadimplência e Caixa</h3>
                  <p className="text-xs text-muted-foreground">
                    Análise heurística e neural com base nos {titulosVencidos.length} títulos vencidos detectados.
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 gap-1.5 text-xs"
                  disabled={carregandoAnalise}
                  onClick={executarAnalise}
                >
                  <RefreshCw className={`size-3.5 ${carregandoAnalise ? "animate-spin" : ""}`} />
                  Recalcular IA
                </Button>
              </div>

              {carregandoAnalise ? (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                  <Loader2 className="size-8 animate-spin text-brand" />
                  <p className="mt-3 text-sm font-semibold">O Gemini está analisando sua carteira...</p>
                </div>
              ) : analise ? (
                <div className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-xl border bg-muted/40 p-3.5">
                      <p className="text-xs text-muted-foreground font-semibold">Valor em Atraso</p>
                      <p className="mt-1 text-2xl font-black text-destructive">
                        {formatCurrency(analise.valorTotalEmRisco)}
                      </p>
                    </div>
                    <div className="rounded-xl border bg-muted/40 p-3.5">
                      <p className="text-xs text-muted-foreground font-semibold">Taxa de Inadimplência</p>
                      <p className="mt-1 text-2xl font-black text-warning">{analise.indiceInadimplencia}</p>
                    </div>
                    <div className="rounded-xl border bg-muted/40 p-3.5">
                      <p className="text-xs text-muted-foreground font-semibold">Nível de Risco Operacional</p>
                      <Badge
                        variant="outline"
                        className={`mt-2 font-bold ${
                          analise.nivelRisco === "CRÍTICO"
                            ? "border-destructive text-destructive bg-destructive/10"
                            : analise.nivelRisco === "MODERADO"
                            ? "border-warning text-warning bg-warning/10"
                            : "border-brand text-brand bg-brand/10"
                        }`}
                      >
                        {analise.nivelRisco}
                      </Badge>
                    </div>
                  </div>

                  <div className="rounded-xl border border-brand/20 bg-brand/5 p-4 text-xs leading-relaxed">
                    <p className="font-bold text-brand flex items-center gap-1.5 mb-1.5">
                      <Sparkles className="size-4" /> Diagnóstico do Gemini
                    </p>
                    <p className="text-foreground">{analise.resumoGeral}</p>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Plano de Ação Recomendado
                    </h4>
                    <div className="space-y-1.5">
                      {analise.acoesRecomendadas.map((acao, index) => (
                        <div
                          key={index}
                          className="flex items-start gap-2.5 rounded-lg border bg-card p-2.5 text-xs font-medium"
                        >
                          <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-brand/20 text-brand font-bold text-[10px]">
                            {index + 1}
                          </span>
                          <span>{acao}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {analise.clientesPrioritarios.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Clientes Críticos para Cobrança Imediata
                      </h4>
                      <div className="space-y-2">
                        {analise.clientesPrioritarios.map((item, idx) => (
                          <div
                            key={idx}
                            className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl border bg-muted/20 p-3 text-xs"
                          >
                            <div>
                              <p className="font-extrabold text-sm">{item.cliente}</p>
                              <p className="text-muted-foreground mt-0.5">
                                Atraso: <span className="font-bold text-destructive">{item.diasAtraso} dias</span> ·
                                Valor: <span className="font-bold text-foreground">{formatCurrency(item.valor)}</span>
                              </p>
                              <p className="text-[11px] text-brand font-medium mt-1">
                                💡 Estratégia: {item.recomendacaoAcao}
                              </p>
                            </div>
                            <Button
                              size="sm"
                              className="h-8 shrink-0 gap-1 text-xs"
                              onClick={() => {
                                const match = titulosVencidos.find(
                                  (t) => t.cliente.toUpperCase() === item.cliente.toUpperCase(),
                                );
                                if (match) {
                                  setClienteSelecionadoId(match.id);
                                  setActiveTab("gerador");
                                }
                              }}
                            >
                              <Wand2 className="size-3" />
                              Cobrar com IA
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : null}
            </TabsContent>

            {/* TAB 2: GERADOR DE MENSAGENS COM IA */}
            <TabsContent value="gerador" className="space-y-4">
              <div>
                <h3 className="font-extrabold text-sm">Gerador de Mensagem Personalizada com Gemini</h3>
                <p className="text-xs text-muted-foreground">
                  A IA redige o texto persuasivo ideal para WhatsApp e e-mail com base no tempo de atraso e tom desejado.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">Cliente Inadimplente</Label>
                  <select
                    className="h-9 w-full rounded-lg border border-input bg-card px-2.5 text-xs font-semibold outline-none focus:ring-2 focus:ring-ring"
                    value={clienteSelecionadoId}
                    onChange={(e) => setClienteSelecionadoId(e.target.value)}
                  >
                    {titulosVencidos.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.cliente} — {formatCurrency(t.mensal_site)} ({t.diasAtraso}d atraso)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">Tom da Comunicação</Label>
                  <div className="grid grid-cols-2 gap-1.5">
                    <Button
                      type="button"
                      size="sm"
                      variant={tomSelecionado === "AMIGAVEL" ? "default" : "outline"}
                      className="h-8 text-[11px]"
                      onClick={() => setTomSelecionado("AMIGAVEL")}
                    >
                      😊 Amigável (0-5d)
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={tomSelecionado === "FORMAL" ? "default" : "outline"}
                      className="h-8 text-[11px]"
                      onClick={() => setTomSelecionado("FORMAL")}
                    >
                      📄 Formal (5-15d)
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={tomSelecionado === "URGENTE_SUSPENSAO" ? "destructive" : "outline"}
                      className="h-8 text-[11px]"
                      onClick={() => setTomSelecionado("URGENTE_SUSPENSAO")}
                    >
                      ⚠️ Suspensão (15d+)
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={tomSelecionado === "RENEGOCIACAO" ? "default" : "outline"}
                      className="h-8 text-[11px]"
                      onClick={() => setTomSelecionado("RENEGOCIACAO")}
                    >
                      🤝 Renegociação
                    </Button>
                  </div>
                </div>
              </div>

              {selectedTitulo && (
                <div className="flex flex-wrap items-center justify-between rounded-lg border bg-muted/30 px-3 py-2 text-xs">
                  <span className="text-muted-foreground">
                    Telefone: <strong>{selectedTitulo.telefone || "Não cadastrado"}</strong> · Vencimento:{" "}
                    <strong>Dia {selectedTitulo.vencimento}</strong>
                  </span>
                  <span className="font-bold text-destructive">
                    {selectedTitulo.diasAtraso} dia(s) em atraso
                  </span>
                </div>
              )}

              <Button
                className="w-full gap-2 font-bold"
                disabled={gerandoMensagem || !selectedTitulo}
                onClick={handleGerarMensagem}
              >
                {gerandoMensagem ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Sparkles className="size-4" />
                )}
                {gerandoMensagem ? "O Gemini está formulando..." : "Redigir Mensagem com Gemini IA"}
              </Button>

              {mensagemGerada && (
                <div className="space-y-3 pt-2">
                  <div className="rounded-xl border border-partner-border bg-partner-soft/40 p-3 text-xs">
                    <p className="font-bold text-partner flex items-center gap-1.5 mb-1">
                      💡 Dica de Negociação da IA:
                    </p>
                    <p className="text-foreground">{mensagemGerada.dicaNegociacao}</p>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-bold flex items-center gap-1.5">
                        <MessageCircle className="size-4 text-emerald-500" />
                        Preview da Mensagem (WhatsApp)
                      </Label>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 gap-1 text-[11px]"
                        onClick={() => handleCopiarTexto(mensagemGerada.textoWhatsapp)}
                      >
                        <Copy className="size-3" /> Copiar
                      </Button>
                    </div>
                    <div className="rounded-xl border bg-emerald-950/20 border-emerald-900/40 p-3.5 font-mono text-xs whitespace-pre-wrap text-emerald-100">
                      {mensagemGerada.textoWhatsapp}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      className="flex-1 gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
                      onClick={handleAbrirWhatsapp}
                    >
                      <Send className="size-4" />
                      Enviar no WhatsApp do Cliente
                    </Button>
                    <Button
                      variant="outline"
                      className="gap-1.5 text-xs"
                      onClick={() => handleCopiarTexto(mensagemGerada.textoWhatsapp)}
                    >
                      <Copy className="size-4" />
                      Copiar
                    </Button>
                  </div>
                </div>
              )}
            </TabsContent>

            {/* TAB 3: CONFIGURAÇÃO GEMINI */}
            <TabsContent value="configuracoes" className="space-y-4">
              <div>
                <h3 className="font-extrabold text-sm">Chave de API do Google Gemini</h3>
                <p className="text-xs text-muted-foreground">
                  Você pode obter uma chave gratuita no Google AI Studio para usufruir de velocidade máxima e respostas neurais ao vivo.
                </p>
              </div>

              <div className="space-y-2 rounded-xl border bg-muted/30 p-4">
                <Label htmlFor="geminiApiKey" className="text-xs font-bold">
                  Sua Chave (API Key) do Google AI Studio
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="geminiApiKey"
                    type="password"
                    placeholder="AIzaSy..."
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    className="font-mono text-xs"
                  />
                  <Button size="sm" onClick={() => salvarApiKey(apiKey)}>
                    Salvar
                  </Button>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  A chave fica salva com segurança no seu navegador e é transmitida apenas via funções de servidor com criptografia TLS.
                </p>
              </div>

              <div className="rounded-xl border border-brand/20 bg-brand/5 p-4 text-xs space-y-2">
                <p className="font-bold text-foreground">Como obter sua chave gratuita:</p>
                <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                  <li>Acesse o <strong>Google AI Studio</strong>.</li>
                  <li>Clique no botão <strong>"Get API key"</strong> no menu lateral.</li>
                  <li>Crie uma nova chave e cole-a no campo acima.</li>
                </ol>
                <div className="pt-2">
                  <Button size="sm" variant="outline" asChild className="gap-1.5 text-xs">
                    <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer">
                      <ExternalLink className="size-3.5" />
                      Abrir Google AI Studio
                    </a>
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}

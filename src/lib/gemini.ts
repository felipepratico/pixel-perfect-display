export type TomCobranca = "AMIGAVEL" | "FORMAL" | "URGENTE_SUSPENSAO" | "RENEGOCIACAO";

export type TituloResumo = {
  id: string;
  cliente: string;
  cnpj: string;
  telefone: string;
  mensal_site: number;
  vencimento: number;
  mes_ano: string;
  diasAtraso: number;
};

export type DiagnosticoGemini = {
  resumoGeral: string;
  indiceInadimplencia: string;
  valorTotalEmRisco: number;
  nivelRisco: "BAIXO" | "MODERADO" | "CRÍTICO";
  acoesRecomendadas: string[];
  clientesPrioritarios: {
    cliente: string;
    diasAtraso: number;
    valor: number;
    recomendacaoAcao: string;
  }[];
  conclusaoEstrategica: string;
};

export type MensagemCobrancaGemini = {
  textoWhatsapp: string;
  assuntoEmail: string;
  textoEmail: string;
  dicaNegociacao: string;
};

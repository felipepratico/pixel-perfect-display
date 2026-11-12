import { computeRow, getDiasVencido, isTituloVencido, type Titulo } from "@/lib/fincontrol";
import type { Cliente } from "@/lib/clientes";

export type PerfilPagamento = "ADIMPLENTE" | "ATRASADOR_LEVE" | "INADIMPLENTE";

export type HistoricoCliente = {
  clienteId: string;
  cliente: string;
  totalTitulos: number;
  pagos: number;
  pagosPontuais: number;
  mediaAtraso: number;
  taxaPontualidade: number;
  perfil: PerfilPagamento;
  receitaRecebida: number;
};

/**
 * Limite (em dias) de atraso acima do qual um cliente em aberto deixa de ser
 * considerado "atraso leve" e passa a ser "inadimplente".
 * Mantido alinhado ao limite histórico de 5 dias usado no score anterior.
 */
const LIMITE_ATRASO_LEVE_DIAS = 5;

/**
 * Classifica o perfil de pagamento com base apenas em cobranças realmente
 * em aberto e vencidas.
 *
 * Títulos quitados (situacao === "PAGO") nunca geram inadimplência, mesmo
 * que tenham sido pagos com atraso no passado. Só títulos em aberto cujo
 * vencimento já ultrapassou contam como atraso.
 */
export function classificarPerfil(diasAtraso: number): PerfilPagamento {
  if (diasAtraso > LIMITE_ATRASO_LEVE_DIAS) return "INADIMPLENTE";
  if (diasAtraso > 0) return "ATRASADOR_LEVE";
  return "ADIMPLENTE";
}

/**
 * Calcula o perfil de adimplência atual de cada cliente.
 *
 * Regras (somente títulos não excluídos):
 * - ADIMPLENTE: não há títulos em aberto vencidos (todos quitados ou a vencer).
 * - ATRASADOR_LEVE: possui títulos em aberto vencidos por até 5 dias.
 * - INADIMPLENTE: possui títulos em aberto vencidos por mais de 5 dias.
 */
export function calcularHistoricoClientes(
  titulos: Titulo[],
  clientes: Cliente[] = [],
): HistoricoCliente[] {
  const porCliente = new Map<string, HistoricoCliente>();
  const porId = new Map<string, Cliente>();
  for (const c of clientes) porId.set(c.id, c);

  const validos = titulos.filter((t) => !t.deleted_at);

  // Primeira passagem: contagem de títulos e quitados por cliente.
  for (const t of validos) {
    const clienteId = t.cliente_id ?? t.cliente;
    if (!clienteId) continue;

    const cliente = porId.get(clienteId) ?? {
      id: clienteId,
      razao_social: t.cliente,
      cnpj: "",
    };
    let registro = porCliente.get(clienteId);
    if (!registro) {
      registro = {
        clienteId,
        cliente: cliente.razao_social,
        totalTitulos: 0,
        pagos: 0,
        pagosPontuais: 0,
        mediaAtraso: 0,
        taxaPontualidade: 0,
        perfil: "ADIMPLENTE",
        receitaRecebida: 0,
      };
      porCliente.set(clienteId, registro);
    }

    registro.totalTitulos += 1;

    if (t.situacao === "PAGO") {
      registro.pagos += 1;
      registro.pagosPontuais += 1;
      registro.receitaRecebida += computeRow(t).mensalSite;
    }
  }

  // Segunda passagem: pior atraso (dias) entre títulos em aberto vencidos por cliente.
  const vencidosPorCliente = new Map<string, { piorAtraso: number; quantidade: number }>();
  for (const t of validos) {
    if (t.situacao !== "ABERTO") continue;
    if (!isTituloVencido(t)) continue;

    const clienteId = t.cliente_id ?? t.cliente;
    if (!clienteId) continue;

    const dias = getDiasVencido(t);
    const atual = vencidosPorCliente.get(clienteId) ?? { piorAtraso: 0, quantidade: 0 };
    atual.piorAtraso = Math.max(atual.piorAtraso, dias);
    atual.quantidade += 1;
    vencidosPorCliente.set(clienteId, atual);
  }

  const resultado: HistoricoCliente[] = [];
  for (const registro of porCliente.values()) {
    const vencidos = vencidosPorCliente.get(registro.clienteId);
    const piorAtraso = vencidos?.piorAtraso ?? 0;
    const qtdVencidos = vencidos?.quantidade ?? 0;

    registro.mediaAtraso = piorAtraso;
    // Share de títulos não vencidos (quitados ou ainda a vencer).
    registro.taxaPontualidade =
      registro.totalTitulos > 0 ? (registro.totalTitulos - qtdVencidos) / registro.totalTitulos : 1;

    registro.perfil = classificarPerfil(piorAtraso);

    resultado.push(registro);
  }

  return resultado.sort((a, b) => b.taxaPontualidade - a.taxaPontualidade);
}

/** Métricas gerais de adimplência (todos os clientes). */
export function metricasAdimplencia(
  titulos: Titulo[],
  clientes: Cliente[] = [],
): {
  totalTitulos: number;
  pagos: number;
  mediaAtrasoGeral: number;
  taxaPontualidadeGeral: number;
  totalClientes: number;
  inadimplentes: number;
} {
  const historico = calcularHistoricoClientes(titulos, clientes);
  const validos = titulos.filter((t) => !t.deleted_at);

  const pagos = historico.reduce((acc, h) => acc + h.pagos, 0);
  const totalTitulos = historico.reduce((acc, h) => acc + h.totalTitulos, 0);

  // Títulos em aberto e vencidos em toda a carteira (fonte de verdade da inadimplência).
  const vencidos = validos.filter((t) => t.situacao === "ABERTO" && isTituloVencido(t));
  const somaAtraso = vencidos.reduce((acc, t) => acc + getDiasVencido(t), 0);
  const mediaAtrasoGeral = vencidos.length > 0 ? somaAtraso / vencidos.length : 0;

  const taxaPontualidadeGeral =
    totalTitulos > 0 ? (totalTitulos - vencidos.length) / totalTitulos : 1;

  const inadimplentes = historico.filter((h) => h.perfil === "INADIMPLENTE").length;

  return {
    totalTitulos,
    pagos,
    mediaAtrasoGeral,
    taxaPontualidadeGeral,
    totalClientes: historico.length,
    inadimplentes,
  };
}

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
  vencidosEmAberto: number;
};

/**
 * Classifica o perfil de pagamento do cliente.
 *
 * Regras:
 * - INADIMPLENTE: possui título vencido ainda em aberto.
 * - ATRASADOR_LEVE: está em dia, mas menos de 90% dos pagamentos foram pontuais.
 * - ADIMPLENTE: está em dia e paga pontualmente.
 *
 * Títulos quitados (situacao === "PAGO") nunca geram inadimplência por si
 * sós; somente títulos em aberto com vencimento ultrapassado contam como
 * atraso, alinhando o badge de /clientes com a tela de Assinaturas/Cobranças.
 */
export function classificarPerfil(
  taxaPontualidade: number,
  mediaAtraso: number,
  vencidosEmAberto = 0,
): PerfilPagamento {
  // Inadimplente = tem título vencido e ainda não pago.
  if (vencidosEmAberto > 0) return "INADIMPLENTE";
  // Pagou tudo, mas com atrasos frequentes ou longos.
  if (taxaPontualidade < 0.9 && mediaAtraso > 0) return "ATRASADOR_LEVE";
  return "ADIMPLENTE";
}

/**
 * Calcula o perfil de adimplência atual de cada cliente.
 *
 * Regras (somente títulos não excluídos):
 * - ADIMPLENTE: não há títulos em aberto vencidos (todos quitados ou a vencer).
 * - ATRASADOR_LEVE: está em dia, mas com histórico de atrasos.
 * - INADIMPLENTE: possui títulos em aberto vencidos.
 */
export function calcularHistoricoClientes(
  titulos: Titulo[],
  clientes: Cliente[] = [],
): HistoricoCliente[] {
  const porCliente = new Map<string, HistoricoCliente>();
  const porId = new Map<string, Cliente>();
  for (const c of clientes) porId.set(c.id, c);

  const validos = titulos.filter((t) => !t.deleted_at);

  // Primeira passagem: contagem de títulos, quitados e vencidos em aberto.
  for (const t of validos) {
    const clienteId = t.cliente_id ?? t.cliente;
    if (!clienteId) continue;

    const cliente = porId.get(clienteId) ?? { id: clienteId, razao_social: t.cliente, cnpj: "" };
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
        vencidosEmAberto: 0,
      };
      porCliente.set(clienteId, registro);
    }

    registro.totalTitulos += 1;

    // Título em aberto já vencido: conta como inadimplência corrente.
    if (t.situacao !== "PAGO" && getDiasVencido(t) > 0) registro.vencidosEmAberto += 1;

    if (t.situacao === "PAGO") {
      registro.pagos += 1;
      registro.pagosPontuais += 1;
      registro.receitaRecebida += computeRow(t).mensalSite;
    }
  }

  // Segunda passagem: pior atraso (dias) entre títulos em aberto vencidos.
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
    const qtdVencidos = vencidos?.quantidade ?? 0;
    registro.mediaAtraso = vencidos?.piorAtraso ?? 0;

    // Share de títulos não vencidos (quitados ou ainda a vencer).
    registro.taxaPontualidade =
      registro.totalTitulos > 0 ? (registro.totalTitulos - qtdVencidos) / registro.totalTitulos : 1;

    // vencidosEmAberto já foi contado na primeira passagem.
    registro.perfil = classificarPerfil(
      registro.taxaPontualidade,
      registro.mediaAtraso,
      registro.vencidosEmAberto,
    );

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

import { computeRow, getDiasVencido, getVencimentoDate, type Titulo } from "@/lib/fincontrol";
import type { Cliente } from "@/lib/clientes";

export type PerfilPagamento = "ADIMPLENTE" | "ATRASADOR_LEVE" | "INADIMPLENTE";

export type HistoricoCliente = {
  clienteId: string;
  cliente: string;
  totalTitulos: number;
  pagos: number;
  pagosPontuais: number;
  mediaAtraso: number;
  taxaPontualidade: number; // 0 a 1
  perfil: PerfilPagamento;
  receitaRecebida: number;
};

/**
 * Classifica o perfil de pagamento do cliente.
 *
 * Regras:
 * - ADIMPLENTE: paga 90%+ em dia.
 * - ATRASADOR_LEVE: paga entre 70% e 90% em dia, com atraso médio <= 5 dias.
 * - INADIMPLENTE: abaixo de 70% em dia ou atraso médio > 5 dias.
 */
export function classificarPerfil(taxaPontualidade: number, mediaAtraso: number): PerfilPagamento {
  if (taxaPontualidade >= 0.9) return "ADIMPLENTE";
  if (taxaPontualidade >= 0.7 && mediaAtraso <= 5) return "ATRASADOR_LEVE";
  return "INADIMPLENTE";
}

/**
 * Calcula o histórico de pagamento por cliente a partir dos títulos.
 *
 * Usa `dias_atraso` quando o título já foi baixado (campo preenchido no momento
 * da baixa); para títulos antigos sem o campo, aproxima pelo vencimento atual.
 */
export function calcularHistoricoClientes(
  titulos: Titulo[],
  clientes: Cliente[] = [],
): HistoricoCliente[] {
  const porCliente = new Map<string, HistoricoCliente>();
  const porId = new Map<string, Cliente>();
  for (const c of clientes) porId.set(c.id, c);

  for (const t of titulos) {
    const clienteId = t.cliente_id ?? t.cliente;
    if (!clienteId) continue;

    const cliente = porId.get(clienteId) ?? { id: clienteId, razao_social: t.cliente, cnpj: "" };
    const registro = porCliente.get(clienteId) ?? {
      clienteId,
      cliente: cliente.razao_social,
      totalTitulos: 0,
      pagos: 0,
      pagosPontuais: 0,
      mediaAtraso: 0,
      taxaPontualidade: 0,
      perfil: "ATRASADOR_LEVE",
      receitaRecebida: 0,
    };

    registro.totalTitulos += 1;

    if (t.situacao === "PAGO") {
      registro.pagos += 1;
      const valor = computeRow(t).mensalSite;
      registro.receitaRecebida += valor;

      // Dias de atraso: usa o campo armazenado na baixa; se não houver, aproxima.
      let atraso = 0;
      if (typeof t.dias_atraso === "number" && t.dias_atraso >= 0) {
        atraso = t.dias_atraso;
      } else if (t.pago_em) {
        const vencimento = getVencimentoDate(t);
        if (vencimento) {
          const diffMs = new Date(t.pago_em).getTime() - vencimento.getTime();
          atraso = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
        }
      } else if (getDiasVencido(t) > 0) {
        // Título vencido mas ainda não baixado: não conta como pagamento.
      }

      if (atraso === 0) registro.pagosPontuais += 1;
      registro.mediaAtraso =
        (registro.mediaAtraso * (registro.pagos - 1) + atraso) / registro.pagos;
    }

    porCliente.set(clienteId, registro);
  }

  const resultado: HistoricoCliente[] = [];
  for (const registro of porCliente.values()) {
    const taxaPontualidade = registro.pagos > 0 ? registro.pagosPontuais / registro.pagos : 0;
    const perfil = classificarPerfil(taxaPontualidade, registro.mediaAtraso);
    resultado.push({
      ...registro,
      taxaPontualidade,
      perfil,
    });
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
  const pagos = historico.reduce((acc, h) => acc + h.pagos, 0);
  const pagosPontuais = historico.reduce((acc, h) => acc + h.pagosPontuais, 0);
  const totalTitulos = historico.reduce((acc, h) => acc + h.totalTitulos, 0);
  const totalPagos = historico.reduce((acc, h) => acc + h.pagos, 0);
  const somaAtraso = historico.reduce((acc, h) => acc + h.mediaAtraso * h.pagos, 0);
  const mediaAtrasoGeral = totalPagos > 0 ? somaAtraso / totalPagos : 0;
  const taxaPontualidadeGeral = pagos > 0 ? pagosPontuais / pagos : 0;
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

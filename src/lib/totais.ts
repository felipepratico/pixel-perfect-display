import { valorContrato, type Cliente } from "@/lib/clientes";
import {
  calcularEncargosTitulo,
  type ConfiguracoesFinanceiras,
} from "@/lib/configuracoes-financeiras";
import {
  chaveClienteDoTitulo,
  chaveDoCliente,
  computeRow,
  isActiveSubscription,
  getDiasAtrasoEncargos,
  isTituloVencido,
  type Titulo,
} from "@/lib/fincontrol";

export type Totais = {
  quantidade: number;
  mensalSite: number;
  mensalReal: number;
  custoBoleto: number;
  lucroFrancisco: number;
  custoBltFra: number;
  lucroFelipe: number;
  /** Soma dos títulos já com juros e multa. */
  valorTotal: number;
  pagos: number;
  abertos: number;
  vencidos: number;
  valorVencido: number;
  assinaturasAtivas: number;
  assinaturasCanceladas: number;
  mrr: number;
};

export function calcularTotais(
  titulos: Titulo[],
  todos: Titulo[],
  clientes: Cliente[] = [],
  config: ConfiguracoesFinanceiras | null = null,
): Totais {
  const totais: Totais = {
    quantidade: titulos.length,
    mensalSite: 0,
    mensalReal: 0,
    custoBoleto: 0,
    lucroFrancisco: 0,
    custoBltFra: 0,
    lucroFelipe: 0,
    valorTotal: 0,
    pagos: 0,
    abertos: 0,
    vencidos: 0,
    valorVencido: 0,
    assinaturasAtivas: 0,
    assinaturasCanceladas: 0,
    mrr: 0,
  };

  for (const titulo of titulos) {
    const calc = computeRow(titulo);

    let valorTotal = calc.valorTotal;
    let lucroFelipe = calc.lucroFelipe;
    let repasse = calc.lucroFrancisco;

    if (config) {
      const dias = getDiasAtrasoEncargos(titulo);
      if (String(titulo.situacao || "").toUpperCase() === "PAGO") console.debug("[totais] PAGO", titulo.id, "pago_em=", titulo.pago_em, "dias=", dias);
      const enc = calcularEncargosTitulo({
        valorNominal: calc.mensalSite,
        diasAtraso: dias,
        config,
      });
      valorTotal = enc.valorTotal;
      repasse = titulo.valor_repasse_francisco != null
        ? Number(titulo.valor_repasse_francisco) || 0
        : enc.valorRepasseFrancisco;
      lucroFelipe = valorTotal - repasse - calc.custoBoleto;
    }

    totais.mensalSite += calc.mensalSite;
    totais.mensalReal += calc.mensalReal;
    totais.custoBoleto += calc.custoBoleto;
    totais.lucroFrancisco += calc.lucroFrancisco;
    totais.custoBltFra += calc.custoBltFra;
    totais.lucroFelipe += lucroFelipe;
    totais.valorTotal += valorTotal;
    if (titulo.situacao === "PAGO") {
      totais.pagos += 1;
    } else {
      totais.abertos += 1;
      if (isTituloVencido(titulo)) {
        totais.vencidos += 1;
        totais.valorVencido += calc.mensalSite;
      }
    }
  }

  // MRR is a portfolio metric: one value per active client, ignoring filters.
  const porCliente = new Map<string, number>();
  const cancelados = new Set<string>();
  for (const titulo of todos) {
    if (titulo.tipo_cobranca !== "RECORRENTE") continue;
    const chave = chaveClienteDoTitulo(titulo, clientes);
    if (isActiveSubscription(titulo)) {
      porCliente.set(chave, computeRow(titulo).mensalSite);
      cancelados.delete(chave);
    } else if (chave) {
      cancelados.add(chave);
    }
  }

  // Sincronização automática com o cadastro: cliente ATIVO sem nenhum título
  // recorrente também compõe o MRR e o badge de ativas (assinatura virtual,
  // mesma regra do painel de assinaturas). Cliente com título cancelado pelo
  // usuário permanece fora e continua contabilizado como cancelado.
  const chavesComTituloRecorrente = new Set(
    todos
      .filter((titulo) => titulo.tipo_cobranca === "RECORRENTE")
      .map((titulo) => chaveClienteDoTitulo(titulo, clientes)),
  );
  for (const cliente of clientes) {
    if (cliente.status !== "ATIVO" || cliente.deleted_at) continue;
    const chave = chaveDoCliente(cliente);
    if (chavesComTituloRecorrente.has(chave) || porCliente.has(chave)) continue;
    porCliente.set(chave, valorContrato(cliente));
  }

  totais.assinaturasAtivas = porCliente.size;
  totais.assinaturasCanceladas = [...cancelados].filter((chave) => !porCliente.has(chave)).length;
  totais.mrr = [...porCliente.values()].reduce((sum, value) => sum + value, 0);

  return totais;
}

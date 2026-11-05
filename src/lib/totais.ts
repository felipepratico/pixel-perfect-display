import { computeRow, isActiveSubscription, isTituloVencido, type Titulo } from "@/lib/fincontrol";

export type Totais = {
  quantidade: number;
  mensalSite: number;
  mensalReal: number;
  custoBoleto: number;
  lucroFrancisco: number;
  custoBltFra: number;
  lucroFelipe: number;
  pagos: number;
  abertos: number;
  vencidos: number;
  valorVencido: number;
  assinaturasAtivas: number;
  assinaturasCanceladas: number;
  mrr: number;
};

export function calcularTotais(titulos: Titulo[], todos: Titulo[]): Totais {
  const totais: Totais = {
    quantidade: titulos.length,
    mensalSite: 0,
    mensalReal: 0,
    custoBoleto: 0,
    lucroFrancisco: 0,
    custoBltFra: 0,
    lucroFelipe: 0,
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
    totais.mensalSite += calc.mensalSite;
    totais.mensalReal += calc.mensalReal;
    totais.custoBoleto += calc.custoBoleto;
    totais.lucroFrancisco += calc.lucroFrancisco;
    totais.custoBltFra += calc.custoBltFra;
    totais.lucroFelipe += calc.lucroFelipe;
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
    const chave = titulo.cliente_id ?? titulo.cliente;
    if (isActiveSubscription(titulo)) {
      porCliente.set(chave, computeRow(titulo).mensalSite);
      cancelados.delete(chave);
    } else if (chave) {
      cancelados.add(chave);
    }
  }
  totais.assinaturasAtivas = porCliente.size;
  totais.assinaturasCanceladas = [...cancelados].filter((chave) => !porCliente.has(chave)).length;
  totais.mrr = [...porCliente.values()].reduce((sum, value) => sum + value, 0);

  return totais;
}

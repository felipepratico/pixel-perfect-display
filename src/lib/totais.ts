import { computeRow, isActiveSubscription, type Titulo } from "@/lib/fincontrol";

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
  assinaturasAtivas: number;
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
    assinaturasAtivas: 0,
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
    if (titulo.situacao === "PAGO") totais.pagos += 1;
    else totais.abertos += 1;
  }

  // MRR is a portfolio metric: one value per active client, ignoring filters.
  const porCliente = new Map<string, number>();
  for (const titulo of todos) {
    if (!isActiveSubscription(titulo)) continue;
    porCliente.set(titulo.cliente, computeRow(titulo).mensalSite);
  }
  totais.assinaturasAtivas = porCliente.size;
  totais.mrr = [...porCliente.values()].reduce((sum, value) => sum + value, 0);

  return totais;
}

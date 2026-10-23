function converterGrupo(n: number): string {
  const unidades = ["", "um", "dois", "três", "quatro", "cinco", "seis", "sete", "oito", "nove"];
  const especiais = [
    "dez",
    "onze",
    "doze",
    "treze",
    "quatorze",
    "quinze",
    "dezesseis",
    "dezessete",
    "dezoito",
    "dezenove",
  ];
  const dezenas = [
    "",
    "",
    "vinte",
    "trinta",
    "quarenta",
    "cinquenta",
    "sessenta",
    "setenta",
    "oitenta",
    "noventa",
  ];
  const centenas = [
    "",
    "cento",
    "duzentos",
    "trezentos",
    "quatrocentos",
    "quinhentos",
    "seiscentos",
    "setecentos",
    "oitocentos",
    "novecentos",
  ];

  if (n === 100) return "cem";

  const c = Math.floor(n / 100);
  const d = Math.floor((n % 100) / 10);
  const u = n % 10;
  const partes: string[] = [];

  if (c > 0) partes.push(centenas[c]);

  const resto = n % 100;
  if (resto >= 10 && resto <= 19) {
    partes.push(especiais[resto - 10]);
  } else {
    if (d > 0) partes.push(dezenas[d]);
    if (u > 0) partes.push(unidades[u]);
  }

  return partes.join(" e ");
}

export function valorPorExtenso(valor: number): string {
  if (valor === 0) return "zero reais";

  const inteiro = Math.floor(Math.abs(valor));
  const centavos = Math.round((Math.abs(valor) - inteiro) * 100);

  const partesInteiras: string[] = [];

  if (inteiro > 0) {
    const milhoes = Math.floor(inteiro / 1_000_000);
    const milhares = Math.floor((inteiro % 1_000_000) / 1_000);
    const unidades = inteiro % 1_000;

    if (milhoes > 0) {
      partesInteiras.push(`${converterGrupo(milhoes)} ${milhoes === 1 ? "milhão" : "milhões"}`);
    }

    if (milhares > 0) {
      partesInteiras.push(`${milhares === 1 ? "um mil" : `${converterGrupo(milhares)} mil`}`);
    }

    if (unidades > 0) {
      partesInteiras.push(converterGrupo(unidades));
    }
  }

  const resultado: string[] = [];

  if (partesInteiras.length > 0) {
    const textoReais = partesInteiras.join(" e ");
    resultado.push(`${textoReais} ${inteiro === 1 ? "real" : "reais"}`);
  }

  if (centavos > 0) {
    const textoCentavos = converterGrupo(centavos);
    resultado.push(`${textoCentavos} ${centavos === 1 ? "centavo" : "centavos"}`);
  }

  return resultado.join(" e ");
}

import { describe, expect, it } from "vitest";
import {
  calcularSimilaridadeNomes,
  calcularValoresBaixaTitulo,
  conciliarItensExtrato,
  lerArquivoEfi,
  normalizarNomeParaComparacao,
  parseItemExtratoEfi,
  type ItemExtratoEfi,
} from "./conciliacao-efi";
import type { Titulo } from "./fincontrol";

describe("conciliacao-efi", () => {
  it("normaliza nomes removendo LTDA, ME e acentos", () => {
    expect(normalizarNomeParaComparacao("MINI MERCADO MERCADO LTDA - ME")).toBe(
      "MINI MERCADO MERCADO",
    );
    expect(normalizarNomeParaComparacao("PADARIA SÃO JOSÉ EIRELI")).toBe(
      "PADARIA SAO JOSE",
    );
  });

  it("extrai ID da cobrança e nome do pagador no padrão Efí", () => {
    const item: ItemExtratoEfi = {
      Tipo: "Recebimento de cobrança • 1080800445 de MINI MERCADO MERCADO",
      Protocolo: 4866269239,
      Data: "16/11/2026",
      Valor: "84,21",
    };

    const parsed = parseItemExtratoEfi(item, 0);
    expect(parsed).not.toBeNull();
    expect(parsed?.cobrancaId).toBe("1080800445");
    expect(parsed?.nomePagador).toBe("MINI MERCADO MERCADO");
    expect(parsed?.valor).toBe(84.21);
    expect(parsed?.protocolo).toBe("4866269239");
    expect(parsed?.dataOriginal).toBe("16/11/2026");
  });

  it("calcula similaridade de nomes", () => {
    const sim1 = calcularSimilaridadeNomes(
      "MINI MERCADO MERCADO",
      "MINI MERCADO MERCADO LTDA",
    );
    expect(sim1).toBeGreaterThanOrEqual(0.9);

    const sim2 = calcularSimilaridadeNomes(
      "SUPERMERCADO SILVA",
      "PADARIA SOUZA",
    );
    expect(sim2).toBeLessThan(0.3);
  });

  it("concilia por alias bancário prioritariamente", () => {
    const item = parseItemExtratoEfi(
      {
        Tipo: "Recebimento de cobrança • 123 de JOAO DA SILVA ME",
        Protocolo: 1,
        Data: "10/11/2026",
        Valor: "70,00",
      },
      0,
    )!;

    const titulos: Titulo[] = [
      {
        id: "tit-1",
        cliente_id: "cli-123",
        cliente: "SILVA COMERCIO DE ALIMENTOS",
        mensal_site: 70,
        situacao: "ABERTO",
        mes_ano: "11/2026",
        vencimento: 10,
        tipo_cobranca: "RECORRENTE",
        status_assinatura: "ATIVO",
        cnpj: "12345678000199",
        telefone: "",
        nome_contato: null,
        mensal_real: 70,
        custo_boleto: 3.45,
        francisco_pct: 5,
        pago_em: null,
        forma_pagamento: null,
        dias_atraso: null,
        efi_status: "",
        efi_link_pagamento: "",
        efi_linha_digitavel: "",
        deleted_at: null,
        valor_nominal: null,
        valor_total: null,
        valor_multa: null,
        valor_juros: null,
        valor_repasse_francisco: null,
        percentual_francisco_aplicado: null,
        lucro_liquido_felipe: null,
      },
    ];

    const aliases = [
      {
        id: "alias-1",
        cliente_id: "cli-123",
        nome_extrato: "JOAO DA SILVA ME",
      },
    ];

    const matches = conciliarItensExtrato({
      itens: [item],
      titulosAbertos: titulos,
      aliases,
    });

    expect(matches).toHaveLength(1);
    expect(matches[0]!.titulo?.id).toBe("tit-1");
    expect(matches[0]!.metodo).toBe("alias");
    expect(matches[0]!.confianca).toBe("alta");
  });

  it("calcula baixa mantendo regra do Francisco (sem juros) e lucro Felipe", () => {
    const titulo: Titulo = {
      id: "tit-1",
      cliente_id: "cli-1",
      cliente: "MINI MERCADO",
      mensal_site: 70,
      francisco_pct: 5,
      custo_boleto: 3.45,
      situacao: "ABERTO",
      mes_ano: "11/2026",
      vencimento: 10,
      tipo_cobranca: "RECORRENTE",
      status_assinatura: "ATIVO",
      cnpj: "",
      telefone: "",
      nome_contato: null,
      mensal_real: 70,
      pago_em: null,
      forma_pagamento: null,
      dias_atraso: null,
      efi_status: "",
      efi_link_pagamento: "",
      efi_linha_digitavel: "",
      deleted_at: null,
      valor_nominal: null,
      valor_total: null,
      valor_multa: null,
      valor_juros: null,
      valor_repasse_francisco: null,
      percentual_francisco_aplicado: null,
      lucro_liquido_felipe: null,
    };

    // Pagamento em dia (R$ 70,00)
    const baixaEmDia = calcularValoresBaixaTitulo({
      titulo,
      valorPago: 70,
      dataPagamentoIso: "2026-11-10T12:00:00.000Z",
      config: {
        id: "",
        percentual_repasse_francisco: 5,
        multa_atraso_percentual: 5,
        juros_diario_percentual: 0.033,
        custo_boleto_padrao: 3.45,
        updated_at: "",
        updated_by: null,
      },
    });

    expect(baixaEmDia.valor_repasse_francisco).toBe(3.5); // 70 * 5%
    expect(baixaEmDia.lucro_liquido_felipe).toBeCloseTo(63.05, 2); // 70 - 3.50 - 3.45

    // Pagamento com encargos (R$ 84,21)
    const baixaComJuros = calcularValoresBaixaTitulo({
      titulo,
      valorPago: 84.21,
      dataPagamentoIso: "2026-11-16T12:00:00.000Z",
      config: {
        id: "",
        percentual_repasse_francisco: 5,
        multa_atraso_percentual: 5,
        juros_diario_percentual: 0.033,
        custo_boleto_padrao: 3.45,
        updated_at: "",
        updated_by: null,
      },
    });

    // O Francisco recebe APENAS sobre os R$ 70,00 originais = R$ 3,50
    expect(baixaComJuros.valor_repasse_francisco).toBe(3.5);
    // Custo boleto = 3.45
    // Felipe recebe o restante: 84.21 - 3.50 - 3.45 = 77.26
    expect(baixaComJuros.lucro_liquido_felipe).toBeCloseTo(77.26, 2);
    expect(baixaComJuros.valor_total).toBe(84.21);
    expect(baixaComJuros.dias_atraso).toBe(6);
  });

  describe("relatório de cobranças da Efí", () => {
    const tituloBase: Titulo = {
      id: "tit-out",
      cliente_id: "cli-alex",
      cliente: "ALEXANDRE PINHEIRO DA COSTA",
      cnpj: "05.043.018/0001-94",
      telefone: "",
      nome_contato: null,
      mensal_site: 70,
      mensal_real: 70,
      custo_boleto: 3.45,
      francisco_pct: 5,
      vencimento: 5,
      mes_ano: "10/2026",
      tipo_cobranca: "RECORRENTE",
      status_assinatura: "ATIVO",
      situacao: "ABERTO",
      deleted_at: null,
      pago_em: null,
      forma_pagamento: null,
      dias_atraso: null,
      efi_status: "",
      efi_link_pagamento: "",
      efi_linha_digitavel: "",
    };

    const relatorio = [
      {
        charge_id: 1080581062,
        status: "paid",
        total: 7000,
        paid_value: 7368,
        paid_at: "2026-11-13 15:21:58",
        expire_at: "2026-11-05 12:00:00",
        customer: { name: "ALEXANDRE PINHEIRO DA COSTA", document: "05043018000194" },
      },
      { charge_id: 2, status: "unpaid", total: 20000, paid_value: null, paid_at: null, customer: { name: "X", document: "1" } },
      { charge_id: 3, status: "canceled", total: 20000, paid_value: null, paid_at: null, customer: { name: "Y", document: "2" } },
    ];

    it("lê só as cobranças pagas, com valor pago em reais e horário de Brasília", () => {
      const leitura = lerArquivoEfi(relatorio);
      expect(leitura.formato).toBe("relatorio");
      expect(leitura.itens).toHaveLength(1);
      expect(leitura.ignorados).toEqual({ unpaid: 1, canceled: 1 });
      const item = leitura.itens[0]!;
      expect(item.valor).toBe(73.68);
      expect(item.valorOriginal).toBe(70);
      expect(item.documento).toBe("05043018000194");
      expect(item.mesVencimento).toBe("11/2026");
      expect(item.dataOriginal).toBe("13/11/2026 15:21");
      expect(item.dataIso).toBe("2026-11-13T18:21:58.000Z");
    });

    it("encontra o título pelo CNPJ e prefere o mês do vencimento do boleto", () => {
      const { itens } = lerArquivoEfi(relatorio);
      const titulos: Titulo[] = [
        tituloBase,
        { ...tituloBase, id: "tit-nov", mes_ano: "11/2026" },
      ];
      const [match] = conciliarItensExtrato({ itens, titulosAbertos: titulos, aliases: [] });
      expect(match?.metodo).toBe("cnpj");
      expect(match?.titulo?.id).toBe("tit-nov");
    });

    it("encontra o título da matriz quando o boleto sai no CNPJ de uma filial vinculada", () => {
      const filial = [{ ...relatorio[0]!, customer: { name: "FILIAL", document: "11222333000144" } }];
      const { itens } = lerArquivoEfi(filial);
      const [match] = conciliarItensExtrato({
        itens,
        titulosAbertos: [{ ...tituloBase, mes_ano: "11/2026" }],
        aliases: [],
        aliasesCnpj: [{ id: "a1", cliente_id: "cli-alex", cnpj: "11.222.333/0001-44" }],
      });
      expect(match?.metodo).toBe("cnpj");
      expect(match?.titulo?.id).toBe("tit-out");
    });

    it("reconhece pagamento já baixado no sistema para o mesmo cliente e mês", () => {
      const { itens } = lerArquivoEfi(relatorio);
      const [match] = conciliarItensExtrato({
        itens,
        titulosAbertos: [],
        titulosPagos: [{ ...tituloBase, id: "tit-pago", mes_ano: "11/2026", situacao: "PAGO" }],
        aliases: [],
      });
      expect(match?.titulo).toBeNull();
      expect(match?.tituloJaPago?.id).toBe("tit-pago");
    });
  });
});

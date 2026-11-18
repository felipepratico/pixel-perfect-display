import { describe, expect, it } from "vitest";
import {
  calcularSimilaridadeNomes,
  calcularValoresBaixaTitulo,
  conciliarItensExtrato,
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
});


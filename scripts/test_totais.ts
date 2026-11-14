import { calcularTotais } from "../src/lib/totais";
import type { Titulo } from "../src/lib/fincontrol";
import type { ConfiguracoesFinanceiras } from "../src/lib/configuracoes-financeiras";

const config: ConfiguracoesFinanceiras = {
  id: "1",
  percentual_repasse_francisco: 10,
  multa_atraso_percentual: 2,
  juros_diario_percentual: 0.1,
  custo_boleto_padrao: 3.45,
  updated_at: new Date().toISOString(),
  updated_by: null,
};

const titulo: Titulo = {
  id: "1",
  cliente_id: null,
  cliente: "Teste",
  cnpj: "",
  telefone: "",
  nome_contato: null,
  mensal_site: 150,
  mensal_real: 150,
  custo_boleto: 3.45,
  francisco_pct: 10,
  vencimento: 5,
  mes_ano: "11/2026",
  tipo_cobranca: "RECORRENTE",
  status_assinatura: "ATIVO",
  situacao: "PAGO",
  deleted_at: null,
  pago_em: "2026-11-12T15:00:00.000Z",
  forma_pagamento: "pix",
  dias_atraso: null,
  efi_status: "",
  efi_link_pagamento: "",
  efi_linha_digitavel: "",
};

const t1 = calcularTotais([titulo], [titulo], [], config);
console.log("dia1 lucroFelipe:", t1.lucroFelipe);
console.log("dia1 valorTotal:", t1.valorTotal);

// simulate next day by changing pago_em? no, fixed.
"done";
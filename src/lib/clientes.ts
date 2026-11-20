import { z } from "zod";
import { formatCurrency } from "@/lib/fincontrol";

export const MODULOS = [
  "PRÁTICO",
  "PDV",
  "PDVNF-E",
  "NF-E",
  "MOBILE (MESA/COMANDA)",
  "MOBILE PEDIDO",
] as const;

export type Modulo = (typeof MODULOS)[number];
export type Plano = "BÁSICO" | "COMPLETO";
export type ClienteStatus = "ATIVO" | "INATIVO";

export type GrupoCliente = {
  id: string;
  nome: string;
  observacoes: string;
  created_at: string;
  deleted_at: string | null;
};

export type Cliente = {
  id: string;
  grupo_id: string | null;
  // Valores separados da composição da mensalidade (boleto vs. Prático).
  valor_proprio?: number;
  valor_boleto?: number;
  valor_pratico?: number;
  razao_social: string;
  nome_fantasia: string;
  codigo_site: string;
  cnpj: string;
  email: string;
  telefone: string;
  nome_contato: string | null;
  endereco: string;
  numero_endereco: string;
  bairro: string;
  cep: string;
  cidade: string;
  uf: string;
  plano: Plano;
  valor_base: number;
  quantidade_computadores: number;
  valor_computador_adicional: number;
  modulos: string[];
  nao_gerar_assinatura?: boolean;
  vencimento: number;
  rede_vpn: string;
  ultimo_backup: string | null;
  versao_instalada: string;
  data_ultima_atualizacao: string | null;
  tipo_certificado: "" | "A1" | "A3";
  validade_certificado: string | null;
  chave_pix: string;
  observacoes: string;
  status: ClienteStatus;
  mensagem_sistema: string;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ClienteInput = Omit<Cliente, "id" | "created_at" | "updated_at" | "deleted_at">;

export type Configuracoes = {
  versao_atual: string;
  dias_alerta_backup: number;
  dias_alerta_certificado: number;
  efi_ambiente: "HOMOLOGACAO" | "PRODUCAO";
};

export type AtendimentoStatus = "ABERTO" | "EM ANDAMENTO" | "CONCLUÍDO";
export type AtendimentoPrioridade = "BAIXA" | "NORMAL" | "ALTA" | "URGENTE";

export type Atendimento = {
  id: string;
  user_id: string;
  cliente_id: string;
  assunto: string;
  descricao: string;
  status: AtendimentoStatus;
  prioridade: AtendimentoPrioridade;
  aberto_em: string;
  concluido_em: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
  cliente?: { razao_social: string; telefone: string } | null;
};

export type AtendimentoInput = {
  cliente_id: string;
  assunto: string;
  descricao: string;
  status: AtendimentoStatus;
  prioridade: AtendimentoPrioridade;
  concluido_em?: string | null;
};

// Zod validation schemas
export const clienteSchema = z.object({
  grupo_id: z.string().uuid().nullable().optional(),
  valor_proprio: z.coerce.number().min(0).default(0),
  valor_boleto: z.coerce.number().min(0).default(0),
  valor_pratico: z.coerce.number().min(0).default(0),
  razao_social: z.string().trim().min(1, "Razão social / Nome é obrigatório.").max(160),
  nome_fantasia: z.string().trim().max(160).default(""),
  codigo_site: z.string().trim().max(100).default(""),
  cnpj: z.string().trim().max(20).default(""),
  email: z.string().trim().max(255).default(""),
  telefone: z.string().trim().max(20).default(""),
  nome_contato: z.string().trim().max(160).nullable().default(null),
  endereco: z.string().trim().max(180).default(""),
  numero_endereco: z.string().trim().max(30).default(""),
  bairro: z.string().trim().max(100).default(""),
  cep: z.string().trim().max(12).default(""),
  cidade: z.string().trim().max(100).default(""),
  uf: z.string().trim().max(2).default(""),
  plano: z.enum(["BÁSICO", "COMPLETO"]).default("BÁSICO"),
  valor_base: z.coerce.number().min(0, "Valor base não pode ser negativo.").default(80),
  quantidade_computadores: z.coerce.number().int().min(1).max(999).default(1),
  valor_computador_adicional: z.coerce.number().min(0).default(0),
  modulos: z.array(z.string()).default(["PRÁTICO"]),
  nao_gerar_assinatura: z.boolean().default(false),
  vencimento: z.coerce.number().int().min(1).max(31).default(5),
  rede_vpn: z.string().trim().max(160).default(""),
  ultimo_backup: z.string().nullable().default(null),
  versao_instalada: z.string().trim().max(30).default(""),
  data_ultima_atualizacao: z.string().nullable().default(null),
  tipo_certificado: z.enum(["", "A1", "A3"]).default(""),
  validade_certificado: z.string().nullable().default(null),
  chave_pix: z.string().trim().max(255).default(""),
  mensagem_sistema: z.enum(["Normal", "Bloqueado", "Atualização", "Cobrança"]).default("Normal"),
  observacoes: z.string().trim().max(5000).default(""),
  status: z.enum(["ATIVO", "INATIVO"]).default("ATIVO"),
});

export const atendimentoSchema = z.object({
  cliente_id: z.string().uuid("Selecione um cliente válido."),
  assunto: z.string().trim().min(2, "Assunto deve ter pelo menos 2 caracteres.").max(160),
  descricao: z.string().trim().max(5000).default(""),
  status: z.enum(["ABERTO", "EM ANDAMENTO", "CONCLUÍDO"]).default("ABERTO"),
  prioridade: z.enum(["BAIXA", "NORMAL", "ALTA", "URGENTE"]).default("NORMAL"),
  concluido_em: z.string().nullable().optional(),
});

export const grupoClienteSchema = z.object({
  nome: z.string().trim().min(1, "Nome do grupo é obrigatório.").max(120),
  observacoes: z.string().trim().max(2000).default(""),
});

export const emptyCliente = (): ClienteInput => ({
  grupo_id: null,
  valor_proprio: 0,
  valor_boleto: 0,
  valor_pratico: 0,
  razao_social: "",
  nome_fantasia: "",
  codigo_site: "",
  cnpj: "",
  email: "",
  telefone: "",
  nome_contato: null,
  endereco: "",
  numero_endereco: "",
  bairro: "",
  cep: "",
  cidade: "",
  uf: "",
  plano: "BÁSICO",
  valor_base: 80,
  quantidade_computadores: 1,
  valor_computador_adicional: 0,
  modulos: ["PRÁTICO"],
  nao_gerar_assinatura: false,
  vencimento: 5,
  rede_vpn: "",
  ultimo_backup: null,
  versao_instalada: "",
  data_ultima_atualizacao: null,
  tipo_certificado: "",
  validade_certificado: null,
  chave_pix: "",
  mensagem_sistema: "Normal",
  observacoes: "",
  status: "ATIVO",
});

export const emptyAtendimento = (cliente_id = ""): AtendimentoInput => ({
  cliente_id,
  assunto: "",
  descricao: "",
  status: "ABERTO",
  prioridade: "NORMAL",
  concluido_em: null,
});

export function valorContrato(cliente: Pick<ClienteInput, "valor_base" | "quantidade_computadores" | "valor_computador_adicional">): number {
  return Number(cliente.valor_base || 0) + Math.max(0, Number(cliente.quantidade_computadores || 1) - 1) * Number(cliente.valor_computador_adicional || 0);
}

export function ticketMedio(clientes: Cliente[]): number {
  const ativos = clientes.filter((cliente) => cliente.status === "ATIVO" && !cliente.deleted_at && !cliente.nao_gerar_assinatura);
  return ativos.length ? ativos.reduce((total, cliente) => total + valorContrato(cliente), 0) / ativos.length : 0;
}

export function diasDesde(data: string | null): number | null {
  if (!data) return null;
  const valor = new Date(`${data}T12:00:00`);
  return Math.floor((Date.now() - valor.getTime()) / 86_400_000);
}

export function diasAte(data: string | null): number | null {
  if (!data) return null;
  const valor = new Date(`${data}T23:59:59`);
  return Math.ceil((valor.getTime() - Date.now()) / 86_400_000);
}

export function resumoContrato(cliente: Cliente): string {
  return `${cliente.plano} · ${cliente.quantidade_computadores} computador(es) · ${formatCurrency(valorContrato(cliente))}`;
}

/** Valor próprio do CNPJ principal (parte própria), sem vinculados. */
export function valorProprioCliente(
  cliente: Pick<ClienteInput, "valor_base" | "quantidade_computadores" | "valor_computador_adicional">,
): number {
  return valorContrato(cliente);
}

/** Valor consolidado do boleto (Meu Valor): próprio + todos os vinculados. */
export function valorBoletoCliente(
  cliente: (Pick<ClienteInput, "valor_base" | "quantidade_computadores" | "valor_computador_adicional"> & {
    valor_boleto?: number | null;
  }),
  vinculados: Array<Pick<ClienteInput, "valor_base" | "quantidade_computadores" | "valor_computador_adicional">> = [],
): number {
  if (cliente.valor_boleto && Number(cliente.valor_boleto) > 0) return Number(cliente.valor_boleto);
  return valorContrato(cliente) + vinculados.reduce((total, item) => total + valorContrato(item), 0);
}

/** Valor informado/repassado para o Prático (controle), separado do boleto. */
export function valorPraticoCliente(
  cliente: (Pick<ClienteInput, "valor_base"> & { valor_pratico?: number | null }),
  vinculados: Array<Pick<ClienteInput, "valor_base">> = [],
): number {
  if (cliente.valor_pratico && Number(cliente.valor_pratico) > 0) return Number(cliente.valor_pratico);
  return Number(cliente.valor_base || 0) + vinculados.reduce((total, item) => total + Number(item.valor_base || 0), 0);
}

/** Versão consolidada do boleto (Valor UpSystem) considerando CNPJs vinculados existentes. */
export function valorBoletoConsolidadoCliente(
  cliente: Pick<Cliente, "id" | "cnpj" | "valor_base" | "quantidade_computadores" | "valor_computador_adicional" | "valor_boleto">,
  aliasesCnpj: Array<{ cliente_id?: string | null; cnpj: string }> = [],
  clientesCadastrados: Array<Pick<Cliente, "id" | "cnpj" | "valor_base" | "quantidade_computadores" | "valor_computador_adicional">> = [],
): number {
  const vinculados = aliasesCnpj
    .filter((alias) => alias.cliente_id === cliente.id)
    .map((alias) => {
      const digitos = (alias.cnpj || "").replace(/\D/g, "");
      return clientesCadastrados.find((c) => (c.cnpj || "").replace(/\D/g, "") === digitos);
    })
    .filter(Boolean) as Array<Pick<Cliente, "id" | "cnpj" | "valor_base" | "quantidade_computadores" | "valor_computador_adicional">>;

  const consolidado =
    valorContrato(cliente) + vinculados.reduce((total, item) => total + valorContrato(item), 0);

  if (consolidado > 0) return consolidado;
  if (cliente.valor_boleto && Number(cliente.valor_boleto) > 0) return Number(cliente.valor_boleto);
  return valorContrato(cliente);
}

/** Versão consolidada do Valor Prático considerando CNPJs vinculados existentes. */
export function valorPraticoConsolidadoCliente(
  cliente: Pick<Cliente, "id" | "cnpj" | "valor_base" | "valor_pratico">,
  aliasesCnpj: Array<{ cliente_id?: string | null; cnpj: string }> = [],
  clientesCadastrados: Array<Pick<Cliente, "id" | "cnpj" | "valor_base">> = [],
): number {
  const vinculados = aliasesCnpj
    .filter((alias) => alias.cliente_id === cliente.id)
    .map((alias) => {
      const digitos = (alias.cnpj || "").replace(/\D/g, "");
      return clientesCadastrados.find((c) => (c.cnpj || "").replace(/\D/g, "") === digitos);
    })
    .filter(Boolean) as Array<Pick<Cliente, "id" | "cnpj" | "valor_base">>;

  if (cliente.valor_pratico && Number(cliente.valor_pratico) > 0) return Number(cliente.valor_pratico);

  const consolidado =
    Number(cliente.valor_base || 0) +
    vinculados.reduce((total, item) => total + Number(item.valor_base || 0), 0);

  if (consolidado > 0) return consolidado;
  return Number(cliente.valor_base || 0);
}

// Aliases de nomes para compatibilidade com diferentes chamadas.
export const valorProprio = valorProprioCliente;
export const valorPartePropria = valorProprioCliente;
export const valorBoleto = valorBoletoCliente;
export const valorMeuValor = valorBoletoCliente;
export const valorPratico = valorPraticoCliente;
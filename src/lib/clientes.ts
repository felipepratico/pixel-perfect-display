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
  razao_social: string;
  nome_fantasia: string;
  cnpj: string;
  email: string;
  telefone: string;
  plano: Plano;
  valor_base: number;
  quantidade_computadores: number;
  valor_computador_adicional: number;
  modulos: string[];
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

export const emptyCliente = (): ClienteInput => ({
  grupo_id: null,
  razao_social: "",
  nome_fantasia: "",
  cnpj: "",
  email: "",
  telefone: "",
  plano: "BÁSICO",
  valor_base: 80,
  quantidade_computadores: 1,
  valor_computador_adicional: 0,
  modulos: ["PRÁTICO"],
  vencimento: 5,
  rede_vpn: "",
  ultimo_backup: null,
  versao_instalada: "",
  data_ultima_atualizacao: null,
  tipo_certificado: "",
  validade_certificado: null,
  chave_pix: "",
  observacoes: "",
  status: "ATIVO",
});

export function valorContrato(cliente: Pick<ClienteInput, "valor_base" | "quantidade_computadores" | "valor_computador_adicional">): number {
  return Number(cliente.valor_base || 0) + Math.max(0, Number(cliente.quantidade_computadores || 1) - 1) * Number(cliente.valor_computador_adicional || 0);
}

export function ticketMedio(clientes: Cliente[]): number {
  const ativos = clientes.filter((cliente) => cliente.status === "ATIVO" && !cliente.deleted_at);
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
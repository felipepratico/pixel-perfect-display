import { z } from "zod";

export const assinaturaEfiSchema = z.object({
  clienteId: z.string().uuid("Selecione um cliente válido."),
  planId: z.coerce.number().int().positive("Informe o ID do plano Efí."),
  itemName: z.string().trim().min(3, "Informe o nome do serviço.").max(255),
  valor: z.coerce.number().positive("O valor deve ser maior que zero.").max(999999.99),
  vencimento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Informe a data de vencimento."),
  mensagem: z.string().trim().min(3, "Informe uma instrução para o boleto.").max(255),
  razaoSocial: z.string().trim().min(2, "Informe a razão social.").max(255),
  cnpj: z.string().transform((value) => value.replace(/\D/g, "")).pipe(z.string().length(14, "O CNPJ deve ter 14 dígitos.")),
  email: z.string().trim().email("Informe um e-mail válido.").max(255),
  telefone: z.string().transform((value) => value.replace(/\D/g, "")).pipe(z.string().min(10, "Informe um telefone válido.").max(15)),
  endereco: z.string().trim().min(2, "Informe o endereço.").max(255),
  numeroEndereco: z.string().trim().min(1, "Informe o número do endereço.").max(30),
  bairro: z.string().trim().min(2, "Informe o bairro.").max(120),
  cep: z.string().transform((value) => value.replace(/\D/g, "")).pipe(z.string().length(8, "O CEP deve ter 8 dígitos.")),
  cidade: z.string().trim().min(2, "Informe a cidade.").max(120),
  uf: z.string().trim().toUpperCase().regex(/^[A-Z]{2}$/, "Informe a UF com 2 letras."),
});

export type AssinaturaEfiInput = z.input<typeof assinaturaEfiSchema>;

export type CobrancaEfi = {
  id: string;
  cliente_id: string;
  titulo_id: string | null;
  efi_charge_id: number | null;
  efi_subscription_id: number | null;
  status: string;
  vencimento: string;
  valor: number;
  link_pagamento: string;
  linha_digitavel: string;
  pix_copia_cola: string;
  ultimo_erro: string;
  created_at: string;
  cliente: { razao_social: string; telefone: string } | null;
};
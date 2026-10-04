import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import type { CobrancaEfi } from "@/lib/efi";

export const COBRANCAS_EFI_KEY = ["cobrancas-efi"] as const;

export function useCobrancasEfi() {
  return useQuery({
    queryKey: COBRANCAS_EFI_KEY,
    queryFn: async (): Promise<CobrancaEfi[]> => {
      const { data, error } = await supabase
        .from("cobrancas_efi")
        .select("id, cliente_id, titulo_id, efi_charge_id, efi_subscription_id, status, vencimento, valor, link_pagamento, linha_digitavel, pix_copia_cola, ultimo_erro, created_at, cliente:clientes(razao_social, telefone)")
        .is("deleted_at", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as CobrancaEfi[];
    },
  });
}
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import type { Titulo, TituloInput } from "@/lib/fincontrol";

const KEY = ["titulos"] as const;

const COLUMNS =
  "id, cliente_id, cliente, cnpj, telefone, mensal_site, mensal_real, custo_boleto, francisco_pct, vencimento, mes_ano, tipo_cobranca, status_assinatura, situacao, deleted_at, efi_status, efi_link_pagamento, efi_linha_digitavel";

export function useTitulos() {
  return useQuery({
    queryKey: KEY,
    queryFn: async (): Promise<Titulo[]> => {
      const { data, error } = await supabase
        .from("titulos")
        .select(COLUMNS)
        .is("deleted_at", null)
        .order("cliente", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as Titulo[];
    },
  });
}

async function currentUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error("Sessão expirada. Entre novamente.");
  return data.user.id;
}

export function useTituloMutations() {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: KEY });

  const saveTitulo = useMutation({
    mutationFn: async ({ id, values }: { id?: string; values: TituloInput }) => {
      if (id) {
        const { error } = await supabase.from("titulos").update(values).eq("id", id);
        if (error) throw error;
        return;
      }
      const user_id = await currentUserId();
      const { error } = await supabase.from("titulos").insert({ ...values, user_id });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const insertMany = useMutation({
    mutationFn: async (rows: TituloInput[]) => {
      const user_id = await currentUserId();
      const payload = rows.map((row) => ({ ...row, user_id }));
      for (let i = 0; i < payload.length; i += 200) {
        const { error } = await supabase.from("titulos").insert(payload.slice(i, i + 200));
        if (error) throw error;
      }
      return payload.length;
    },
    onSuccess: invalidate,
  });

  const patchMany = useMutation({
    mutationFn: async ({ ids, values }: { ids: string[]; values: Partial<TituloInput> }) => {
      const { error } = await supabase.from("titulos").update(values).in("id", ids);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const removeMany = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase.from("titulos").update({ deleted_at: new Date().toISOString() }).in("id", ids);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const removeAll = useMutation({
    mutationFn: async () => {
      const user_id = await currentUserId();
      const { error } = await supabase.from("titulos").update({ deleted_at: new Date().toISOString() }).eq("user_id", user_id).is("deleted_at", null);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return { saveTitulo, insertMany, patchMany, removeMany, removeAll };
}

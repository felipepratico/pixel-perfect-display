import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import type {
  Atendimento,
  AtendimentoInput,
  Cliente,
  ClienteInput,
  Configuracoes,
  GrupoCliente,
} from "@/lib/clientes";

const CLIENTES_KEY = ["clientes"] as const;
const GRUPOS_KEY = ["grupos-clientes"] as const;
const CONFIG_KEY = ["configuracoes-usuario"] as const;
const ATENDIMENTOS_KEY = ["atendimentos"] as const;

async function currentUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error("Sessão expirada. Entre novamente.");
  return data.user.id;
}

export function useClientes(incluirExcluidos = false) {
  return useQuery({
    queryKey: [...CLIENTES_KEY, incluirExcluidos],
    queryFn: async (): Promise<Cliente[]> => {
      let query = supabase.from("clientes").select("*").order("razao_social");
      if (!incluirExcluidos) query = query.is("deleted_at", null);
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as Cliente[];
    },
  });
}

export function useGrupos() {
  return useQuery({
    queryKey: GRUPOS_KEY,
    queryFn: async (): Promise<GrupoCliente[]> => {
      const { data, error } = await supabase
        .from("grupos_clientes")
        .select("*")
        .is("deleted_at", null)
        .order("nome");
      if (error) throw error;
      return (data ?? []) as GrupoCliente[];
    },
  });
}

export function useConfiguracoes() {
  return useQuery({
    queryKey: CONFIG_KEY,
    queryFn: async (): Promise<Configuracoes> => {
      const userId = await currentUserId();
      const { data, error } = await supabase
        .from("configuracoes_usuario")
        .select("versao_atual, dias_alerta_backup, dias_alerta_certificado, efi_ambiente")
        .eq("user_id", userId)
        .maybeSingle();
      if (error) throw error;
      return (data ?? {
        versao_atual: "2026.09",
        dias_alerta_backup: 7,
        dias_alerta_certificado: 30,
        efi_ambiente: "HOMOLOGACAO",
      }) as Configuracoes;
    },
  });
}

export function useAtendimentos(clienteId?: string) {
  return useQuery({
    queryKey: [...ATENDIMENTOS_KEY, clienteId ?? "all"],
    queryFn: async (): Promise<Atendimento[]> => {
      let query = supabase
        .from("atendimentos")
        .select(
          "id, user_id, cliente_id, assunto, descricao, status, prioridade, aberto_em, concluido_em, deleted_at, created_at, updated_at, cliente:clientes(razao_social, telefone)",
        )
        .is("deleted_at", null)
        .order("aberto_em", { ascending: false });

      if (clienteId) {
        query = query.eq("cliente_id", clienteId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as unknown as Atendimento[];
    },
  });
}

export function useClienteMutations() {
  const queryClient = useQueryClient();
  const refresh = () => queryClient.invalidateQueries({ queryKey: CLIENTES_KEY });
  const refreshGrupos = () => queryClient.invalidateQueries({ queryKey: GRUPOS_KEY });

  const saveCliente = useMutation({
    mutationFn: async ({ id, values }: { id?: string; values: ClienteInput }): Promise<string> => {
      const colunasComposicao = ["valor_proprio", "valor_boleto", "valor_pratico"] as const;
      const tentar = async (payload: ClienteInput) => {
        if (id) {
          const { error } = await supabase.from("clientes").update(payload).eq("id", id);
          if (error) throw error;
          return id;
        }
        const user_id = await currentUserId();
        const { data, error } = await supabase
          .from("clientes")
          .insert({ ...payload, user_id })
          .select("id")
          .single();
        if (error) throw error;
        return (data as { id: string }).id;
      };

      try {
        return await tentar(values);
      } catch (error) {
        const mensagem = (error as { message?: string })?.message || "";
        const colunaAusente = colunasComposicao.find((coluna) =>
          mensagem.toLowerCase().includes(coluna),
        );
        if (colunaAusente) {
          // Fallback de segurança: salva sem as colunas ainda não existentes no banco.
          const { valor_proprio: _vp, valor_boleto: _vb, valor_pratico: _vpr, ...resto } =
            values as ClienteInput & Record<string, unknown>;
          return await tentar(resto as ClienteInput);
        }
        throw new Error(mensagem || "Não foi possível salvar o cliente.");
      }
    },
    onSuccess: refresh,
  });

  const softDeleteCliente = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("clientes")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: refresh,
  });

  const patchCliente = useMutation({
    mutationFn: async ({ id, values }: { id: string; values: Partial<ClienteInput> }) => {
      const { error } = await supabase.from("clientes").update(values).eq("id", id);
      if (error) throw error;
    },
    onSuccess: refresh,
  });

  const restoreCliente = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("clientes").update({ deleted_at: null }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: refresh,
  });

  const createGrupo = useMutation({
    mutationFn: async (nome: string) => {
      const user_id = await currentUserId();
      const { data, error } = await supabase
        .from("grupos_clientes")
        .insert({ user_id, nome: nome.trim().toUpperCase() })
        .select("*")
        .single();
      if (error) throw error;
      return data as GrupoCliente;
    },
    onSuccess: refreshGrupos,
  });

  const saveConfiguracoes = useMutation({
    mutationFn: async (values: Configuracoes) => {
      const user_id = await currentUserId();
      const { error } = await supabase.from("configuracoes_usuario").upsert({ ...values, user_id });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CONFIG_KEY }),
  });

  return { saveCliente, softDeleteCliente, restoreCliente, patchCliente, createGrupo, saveConfiguracoes };
}

export function useAtendimentoMutations() {
  const queryClient = useQueryClient();
  const refresh = () => queryClient.invalidateQueries({ queryKey: ATENDIMENTOS_KEY });

  const saveAtendimento = useMutation({
    mutationFn: async ({ id, values }: { id?: string; values: AtendimentoInput }) => {
      if (id) {
        const { error } = await supabase.from("atendimentos").update(values).eq("id", id);
        if (error) throw error;
        return;
      }
      const user_id = await currentUserId();
      const { error } = await supabase.from("atendimentos").insert({ ...values, user_id });
      if (error) throw error;
    },
    onSuccess: refresh,
  });

  const setStatusAtendimento = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: Atendimento["status"] }) => {
      const concluido_em = status === "CONCLUÍDO" ? new Date().toISOString() : null;
      const { error } = await supabase
        .from("atendimentos")
        .update({ status, concluido_em })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: refresh,
  });

  const softDeleteAtendimento = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("atendimentos")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: refresh,
  });

  return { saveAtendimento, setStatusAtendimento, softDeleteAtendimento };
}

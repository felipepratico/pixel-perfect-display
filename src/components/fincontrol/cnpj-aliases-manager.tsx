import { Loader2, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import {
  buscarAliasesCnpj,
  excluirAliasCnpj,
  salvarAliasCnpj,
  type ClienteAliasCnpj,
} from "@/lib/conciliacao-efi";
import { onlyDigits } from "@/lib/cnpj";
import { supabase } from "@/integrations/supabase/client";

export function CnpjAliasesManager({ clienteId }: { clienteId: string | null }) {
  const [aliases, setAliases] = useState<ClienteAliasCnpj[]>([]);
  const [novoCnpj, setNovoCnpj] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [salvando, setSalvando] = useState(false);

  async function carregar() {
    if (!clienteId) return;
    setCarregando(true);
    try {
      const todos = await buscarAliasesCnpj();
      setAliases(todos.filter((a) => a.cliente_id === clienteId));
    } catch (error) {
      toast.error("Não foi possível carregar os CNPJs vinculados.");
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    void carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clienteId]);

  async function adicionar() {
    if (!clienteId) return;
    const digitos = onlyDigits(novoCnpj);
    if (digitos.length !== 14) {
      toast.warning("Informe um CNPJ com 14 dígitos.");
      return;
    }

    // Verifica se o CNPJ já pertence a outro cadastro de cliente.
    try {
      const { data: clientesExistentes } = await supabase
        .from("clientes")
        .select("id, razao_social, cnpj")
        .is("deleted_at", null);
      const clienteExistente = (clientesExistentes || []).find(
        (c: any) => onlyDigits(c.cnpj) === digitos,
      );
      if (clienteExistente) {
        if (clienteExistente.id === clienteId) {
          toast.info("Este CNPJ já é o principal deste cliente.");
        } else {
          toast.error(
            `Este CNPJ já está cadastrado no cliente ${clienteExistente.razao_social}.`,
          );
        }
        return;
      }

      const aliasesExistentes = await buscarAliasesCnpj();
      const aliasExistente = aliasesExistentes.find(
        (a) => onlyDigits(a.cnpj) === digitos,
      );
      if (aliasExistente) {
        if (aliasExistente.cliente_id === clienteId) {
          toast.info("Este CNPJ já está vinculado a este cliente.");
        } else {
          const clientePrincipal = (clientesExistentes || []).find(
            (c: any) => c.id === aliasExistente.cliente_id,
          );
          toast.error(
            `Este CNPJ já está vinculado ao cliente ${
              clientePrincipal?.razao_social || "principal"
            }.`,
          );
        }
        return;
      }
    } catch (error) {
      // Se a verificação falhar, segue para tentar o vínculo normalmente.
    }

    setSalvando(true);
    try {
      const salvo = await salvarAliasCnpj(clienteId, novoCnpj);
      if (!salvo) throw new Error("Não foi possível vincular o CNPJ.");
      setNovoCnpj("");
      toast.success("CNPJ vinculado ao cadastro principal.");
      await carregar();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Não foi possível vincular o CNPJ.",
      );
    } finally {
      setSalvando(false);
    }
  }

  async function remover(id: string) {
    try {
      await excluirAliasCnpj(id);
      setAliases((prev) => prev.filter((a) => a.id !== id));
      toast.success("Vínculo removido.");
    } catch {
      toast.error("Não foi possível remover o vínculo.");
    }
  }

  if (!clienteId) {
    return (
      <p className="text-xs text-muted-foreground">
        Salve o cliente primeiro para poder vincular CNPJs secundários.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Input
          placeholder="CNPJ secundário (14 dígitos)"
          value={novoCnpj}
          onChange={(e) => setNovoCnpj(e.target.value)}
          inputMode="numeric"
          maxLength={18}
        />
        <Button type="button" onClick={adicionar} disabled={salvando}>
          {salvando ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
          Vincular
        </Button>
      </div>

      {carregando ? (
        <p className="text-xs text-muted-foreground">Carregando vínculos...</p>
      ) : aliases.length === 0 ? (
        <p className="text-xs text-muted-foreground">Nenhum CNPJ secundário vinculado.</p>
      ) : (
        <ul className="space-y-2">
          {aliases.map((alias) => (
            <li
              key={alias.id}
              className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
            >
              <span>{alias.cnpj}</span>
              <Button type="button" size="icon" variant="ghost" onClick={() => remover(alias.id)}>
                <Trash2 className="size-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}


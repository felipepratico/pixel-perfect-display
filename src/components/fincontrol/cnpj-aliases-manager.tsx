import { Loader2, Plus, Search, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { buscarAliasesCnpj, excluirAliasCnpj, salvarAliasCnpjDetalhado, type ClienteAliasCnpj } from "@/lib/conciliacao-efi";
import { useClientes } from "@/lib/use-clientes";
import type { Cliente } from "@/lib/clientes";
import { onlyDigits } from "@/lib/cnpj";
import { supabase } from "@/integrations/supabase/client";

export function CnpjAliasesManager({ clienteId }: { clienteId: string | null }) {
  const { data: clientesCadastrados = [] } = useClientes();
  const [aliases, setAliases] = useState<ClienteAliasCnpj[]>([]);
  const [buscaCliente, setBuscaCliente] = useState("");
  const [dropdownAberto, setDropdownAberto] = useState(false);
  const [clienteSelecionado, setClienteSelecionado] = useState<Cliente | null>(null);
  const [novoCnpj, setNovoCnpj] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [salvando, setSalvando] = useState(false);

  async function carregar() {
    if (!clienteId) return;
    setCarregando(true);
    try {
      const todos = await buscarAliasesCnpj();
      setAliases(todos.filter((a) => a.cliente_id === clienteId));
    } catch {
      toast.error("Não foi possível carregar os CNPJs vinculados.");
    } finally {
      setCarregando(false);
    }
  }

  // Carrega aliases ao abrir o cliente.
  useEffect(() => {
    void carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clienteId]);

  const clientesFiltrados = useMemo(() => {
    const termo = buscaCliente.trim().toLowerCase();
    if (!termo || clienteSelecionado) return [];
    const termoDigitos = onlyDigits(termo);
    return clientesCadastrados
      .filter((c) => c.id !== clienteId)
      .filter((c) => {
        const nome = (c.razao_social || "").toLowerCase();
        const cnpj = onlyDigits(c.cnpj || "");
        const codigo = (c.codigo_site || "").toLowerCase();
        if (nome.includes(termo)) return true;
        if (codigo && codigo.includes(termo)) return true;
        if (termoDigitos && cnpj.includes(termoDigitos)) return true;
        return false;
      })
      .slice(0, 12);
  }, [buscaCliente, clientesCadastrados, clienteId, clienteSelecionado]);

  function selecionarCliente(cliente: Cliente) {
    setClienteSelecionado(cliente);
    setNovoCnpj(cliente.cnpj || "");
    setBuscaCliente(
      `${cliente.razao_social} • ${cliente.cnpj || "—"} • Cód. Site: ${cliente.codigo_site || "—"}`,
    );
    setDropdownAberto(false);
  }

  function limparSelecao() {
    setClienteSelecionado(null);
    setNovoCnpj("");
  }

  async function adicionar() {
    if (!clienteId) return;
    const digitos = onlyDigits(novoCnpj || buscaCliente);
    if (digitos.length !== 14) {
      toast.warning("Informe um CNPJ com 14 dígitos ou selecione um cliente.");
      return;
    }

    // Bloqueia vincular o próprio CNPJ do cliente em edição.
    const clienteAtual = clientesCadastrados.find((c) => c.id === clienteId);
    if (clienteAtual && onlyDigits(clienteAtual.cnpj || "") === digitos) {
      toast.error("Não é possível vincular o próprio CNPJ deste cliente.");
      return;
    }

    // Bloqueia se o CNPJ já estiver vinculado a outro cadastro principal.
    try {
      const aliasesExistentes = await buscarAliasesCnpj();
      const aliasExistente = aliasesExistentes.find(
        (a) => onlyDigits(a.cnpj) === digitos,
      );
      if (aliasExistente) {
        if (aliasExistente.cliente_id === clienteId) {
          toast.info("Este CNPJ já está vinculado a este cliente.");
          return;
        }
        const principal = clientesCadastrados.find(
          (c) => c.id === aliasExistente.cliente_id,
        );
        toast.error(
          `Este CNPJ já está vinculado ao cliente ${
            principal?.razao_social || "principal"
          }.`,
        );
        return;
      }
    } catch {
      // segue tentativa normal
    }

    setSalvando(true);
    try {
      const resultado = await salvarAliasCnpjDetalhado(
        clienteId,
        (novoCnpj || buscaCliente).trim(),
      );
      if (!resultado.registro) {
        const erro = resultado.erro;
        const mensagem = erro?.details
          ? `${erro.message} (${erro.details})`
          : erro?.message || "Não foi possível vincular o CNPJ.";
        throw new Error(mensagem);
      }
      setBuscaCliente("");
      setNovoCnpj("");
      setClienteSelecionado(null);
      toast.success("CNPJ vinculado ao cadastro principal.");
      await carregar();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível vincular o CNPJ.");
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
      <div className="relative">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar cliente por nome, CNPJ ou Cód. Site, ou digite um CNPJ novo"
              value={buscaCliente}
              onChange={(e) => {
                setBuscaCliente(e.target.value);
                setClienteSelecionado(null);
                setNovoCnpj(
                  onlyDigits(e.target.value).length === 14 ? e.target.value : "",
                );
                setDropdownAberto(true);
              }}
              onFocus={() => setDropdownAberto(true)}
              onBlur={() => setTimeout(() => setDropdownAberto(false), 150)}
              className="pl-9"
            />
            {clienteSelecionado ? (
              <button
                type="button"
                onClick={limparSelecao}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
              >
                limpar
              </button>
            ) : null}
          </div>
          <Button type="button" onClick={adicionar} disabled={salvando}>
            {salvando ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
            Vincular
          </Button>
        </div>

        {dropdownAberto && clientesFiltrados.length > 0 ? (
          <div className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border bg-popover p-1 shadow-md">
            {clientesFiltrados.map((cliente) => (
              <button
                key={cliente.id}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => selecionarCliente(cliente)}
                className="flex w-full flex-col items-start rounded-sm px-3 py-2 text-left text-sm hover:bg-accent"
              >
                <span className="font-medium">{cliente.razao_social}</span>
                <span className="text-xs text-muted-foreground">
                  {cliente.cnpj || "—"} • Cód. Site: {cliente.codigo_site || "—"}
                </span>
              </button>
            ))}
          </div>
        ) : null}
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
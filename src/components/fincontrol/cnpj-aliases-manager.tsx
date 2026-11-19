import { ExternalLink, Loader2, Plus, Search, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { buscarAliasesCnpj, excluirAliasCnpj, salvarAliasCnpjDetalhado, type ClienteAliasCnpj } from "@/lib/conciliacao-efi";
import { useClientes } from "@/lib/use-clientes";
import { useTitulos } from "@/lib/use-titulos";
import type { Cliente } from "@/lib/clientes";
import { valorContrato } from "@/lib/clientes";
import { formatCurrency, getVencimentoDate, parseNumber, currentMesAno } from "@/lib/fincontrol";
import { onlyDigits } from "@/lib/cnpj";
import { supabase } from "@/integrations/supabase/client";

export function CnpjAliasesManager({
  clienteId,
  onAbrirCliente,
  valorTotal,
  onAjustarValorBase,
}: {
  clienteId: string | null;
  onAbrirCliente?: ((cliente: Cliente) => void) | undefined;
  valorTotal?: number;
  onAjustarValorBase?: (delta: number) => void;
}) {
  const { data: clientesCadastrados = [] } = useClientes();
  const { data: titulos = [] } = useTitulos();
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

    const clienteAtual = clientesCadastrados.find((c) => c.id === clienteId);
    if (clienteAtual && onlyDigits(clienteAtual.cnpj || "") === digitos) {
      toast.error("Não é possível vincular o próprio CNPJ deste cliente.");
      return;
    }

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
      // Marca o cliente secundário como "não gerar assinatura/cobrança".
      const secundario =
        clienteSelecionado ||
        clientesCadastrados.find((c) => onlyDigits(c.cnpj || "") === digitos);
      if (secundario) {
        try {
          await supabase
            .from("clientes")
            .update({ nao_gerar_assinatura: true })
            .eq("id", secundario.id);
        } catch {
          // não bloqueia o vínculo
        }
        await ajustarValorPrincipal(valorContrato(secundario));
      }
      setClienteSelecionado(null);
      toast.success("CNPJ vinculado ao cadastro principal.");
      await carregar();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível vincular o CNPJ.");
    } finally {
      setSalvando(false);
    }
  }

  async function ajustarValorPrincipal(delta: number) {
    if (!clienteId || !delta) return;
    const principal = clientesCadastrados.find((c) => c.id === clienteId);
    const atual = Number(principal?.valor_base || 0);
    const novo = Math.max(0, Math.round((atual + delta) * 100) / 100);
    try {
      await supabase.from("clientes").update({ valor_base: novo }).eq("id", clienteId);
    } catch {
      // ignora
    }
    onAjustarValorBase?.(delta);
    toast.info(`Valor base ${delta > 0 ? "somado" : "reduzido"} em ${formatCurrency(Math.abs(delta))}.`);
  }

  async function remover(id: string) {
    const alias = aliases.find((a) => a.id === id);
    const confirmar = window.confirm("Remover este vínculo de CNPJ?");
    if (!confirmar) return;
    try {
      await excluirAliasCnpj(id);
      setAliases((prev) => prev.filter((a) => a.id !== id));

      // Reativa a geração de assinatura no cliente secundário, se existir.
      if (alias) {
        const secundario = clientesCadastrados.find(
          (c) => onlyDigits(c.cnpj || "") === onlyDigits(alias.cnpj),
        );
        if (secundario) {
          try {
            await supabase
              .from("clientes")
              .update({ nao_gerar_assinatura: false })
              .eq("id", secundario.id);
          } catch {
            // ignora
          }
          await ajustarValorPrincipal(-valorContrato(secundario));
        }
      }

      toast.success("Vínculo removido.");
    } catch {
      toast.error("Não foi possível remover o vínculo.");
    }
  }

  function dadosCliente(alias: ClienteAliasCnpj): Cliente | undefined {
    // O alias.cliente_id é o cadastro PRINCIPAL (o cliente em edição).
    // Os dados exibidos devem ser do cliente cujo CNPJ é o vinculado.
    return clientesCadastrados.find(
      (c) => onlyDigits(c.cnpj || "") === onlyDigits(alias.cnpj),
    );
  }

  function tituloDoCliente(cliente: Cliente): any {
    const candidatos = titulos.filter(
      (t: any) =>
        !t.deleted_at &&
        (t.cliente_id === cliente.id ||
          onlyDigits(t.cnpj || "") === onlyDigits(cliente.cnpj || "")),
    );
    if (candidatos.length === 0) return null;
    return candidatos.reduce((maisRecente: any, atual: any) => {
      const rankAtual = (atual.mes_ano || "").localeCompare(maisRecente?.mes_ano || "");
      return rankAtual > 0 ? atual : maisRecente;
    }, candidatos[0]);
  }

  function statusPagamento(titulo: any): "PAGO" | "PENDENTE" | "ATRASADO" {
    if (!titulo) return "PENDENTE";
    if (titulo.situacao === "PAGO") return "PAGO";
    const due = getVencimentoDate(titulo);
    if (due && due.getTime() < Date.now()) return "ATRASADO";
    return "PENDENTE";
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
          {aliases.map((alias) => {
            const cliente = dadosCliente(alias);
            if (!cliente) {
              return (
                <li
                  key={alias.id}
                  className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                >
                  <span className="font-mono">{alias.cnpj}</span>
                  <Button type="button" size="icon" variant="ghost" onClick={() => remover(alias.id)}>
                    <Trash2 className="size-4" />
                  </Button>
                </li>
              );
            }

            const titulo = tituloDoCliente(cliente);
            const valor = titulo ? parseNumber(titulo.mensal_site) : valorContrato(cliente);
            const dueDate = titulo
              ? getVencimentoDate(titulo)
              : getVencimentoDate({ vencimento: cliente.vencimento, mes_ano: currentMesAno() });
            const dataFormatada = dueDate ? dueDate.toLocaleDateString("pt-BR") : "—";
            const diaVencimento = titulo?.vencimento ?? cliente.vencimento;
            const pagamento = statusPagamento(titulo);

            return (
              <li
                key={alias.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-md border px-3 py-2"
              >
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="truncate text-sm font-bold uppercase">{cliente.razao_social}</p>
                  <p className="font-mono text-xs text-muted-foreground">{alias.cnpj}</p>
                  <p className="text-xs text-muted-foreground">
                    {cliente.telefone || "sem telefone"}
                    <span className="ml-2 font-bold text-foreground">{formatCurrency(valor)}</span>
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-1">
                  <Badge
                    variant="secondary"
                    className="cursor-pointer bg-blue-100 text-blue-700 hover:bg-blue-200"
                    onClick={() => onAbrirCliente?.(cliente)}
                  >
                    <ExternalLink className="mr-1 size-3" />
                    {cliente.codigo_site || "—"}
                  </Badge>
                  <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                    {cliente.mensagem_sistema || "Normal"}
                  </Badge>
                  <Badge
                    className={
                      pagamento === "PAGO"
                        ? "bg-green-100 text-green-700 hover:bg-green-100"
                        : pagamento === "ATRASADO"
                          ? "bg-red-100 text-red-700 hover:bg-red-100"
                          : "bg-amber-100 text-amber-700 hover:bg-amber-100"
                    }
                  >
                    <span className="mr-1">•</span>
                    {pagamento}
                  </Badge>
                </div>

                <div className="text-right">
                  <p className="text-sm font-bold">{dataFormatada}</p>
                  <p className="text-xs text-muted-foreground">Dia {diaVencimento}</p>
                </div>

                <Button type="button" size="icon" variant="ghost" onClick={() => remover(alias.id)}>
                  <Trash2 className="size-4" />
                </Button>
              </li>
            );
          })}
        </ul>
      )}
      {aliases.length > 0 && valorTotal !== undefined ? (() => {
        const vinculados = aliases
          .map((a) => dadosCliente(a))
          .filter((c): c is Cliente => Boolean(c));
        const somaVinculados = vinculados.reduce((t, c) => t + valorContrato(c), 0);
        return (
          <div className="space-y-1 rounded-md border bg-muted/40 p-3 text-sm">
            <p className="font-bold">Composição da mensalidade</p>
            <div className="flex justify-between"><span>Principal (parte própria)</span><span>{formatCurrency(Math.max(0, valorTotal - somaVinculados))}</span></div>
            {vinculados.map((c) => (
              <div key={c.id} className="flex justify-between text-muted-foreground"><span>(+) {c.razao_social}</span><span>{formatCurrency(valorContrato(c))}</span></div>
            ))}
            <div className="flex justify-between border-t pt-1 font-bold"><span>= Total da mensalidade</span><span>{formatCurrency(valorTotal)}</span></div>
          </div>
        );
      })() : null}
    </div>
  );
}
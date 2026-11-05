import { CalendarDays, UserPlus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { valorContrato, type Cliente } from "@/lib/clientes";
import { onlyDigits } from "@/lib/cnpj";
import {
  chaveClienteDoTitulo,
  currentMesAno,
  normalizeMesAno,
  type Titulo,
} from "@/lib/fincontrol";

export type NovaAssinaturaValues = {
  clienteId: string | null;
  cliente: string;
  cnpj: string;
  telefone: string;
  valor: number;
  vencimento: number;
  mesAno: string;
  status: "ATIVO" | "CANCELADO";
};

type FiltroCliente = "TODOS" | "ATIVOS" | "INATIVOS" | "SEM_TITULO";
type OrdenacaoCliente = "NOME" | "VENCIMENTO" | "VALOR";

const selectClass =
  "h-10 w-full rounded-xl border border-input bg-card px-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-ring";

const formInicial = (): NovaAssinaturaValues => ({
  clienteId: null,
  cliente: "",
  cnpj: "",
  telefone: "",
  valor: 0,
  vencimento: 5,
  mesAno: currentMesAno(),
  status: "ATIVO",
});

export function NovaAssinaturaDialog({
  open,
  clientes,
  titulos,
  saving,
  onOpenChange,
  onSave,
}: {
  open: boolean;
  clientes: Cliente[];
  titulos: Titulo[];
  saving: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (values: NovaAssinaturaValues) => void | Promise<void>;
}) {
  const [form, setForm] = useState<NovaAssinaturaValues>(formInicial);
  const [erro, setErro] = useState("");
  const [filtroCliente, setFiltroCliente] = useState<FiltroCliente>("TODOS");
  const [ordenacaoCliente, setOrdenacaoCliente] = useState<OrdenacaoCliente>("NOME");

  useEffect(() => {
    if (!open) return;
    setForm(formInicial());
    setErro("");
    setFiltroCliente("TODOS");
    setOrdenacaoCliente("NOME");
  }, [open]);

  /** Mês de referência digitado no formulário (fallback: mês atual). */
  const mesAnoReferencia = normalizeMesAno(form.mesAno) ?? currentMesAno();

  /** Chaves de clientes que já possuem algum título no mês de referência. */
  const chavesComTituloNoMes = useMemo(() => {
    return new Set(
      titulos
        .filter((t) => (normalizeMesAno(t.mes_ano) ?? t.mes_ano) === mesAnoReferencia)
        .map((t) => chaveClienteDoTitulo(t, clientes)),
    );
  }, [titulos, clientes, mesAnoReferencia]);

  /** Testa se o cliente já tem título gerado no mês de referência. */
  function temTituloNoMes(cliente: Cliente): boolean {
    const chave = chaveClienteDoTitulo(
      { cliente_id: cliente.id, cliente: cliente.razao_social, cnpj: cliente.cnpj },
      clientes,
    );
    return chavesComTituloNoMes.has(chave);
  }

  /** Clientes ATIVOS sem título no mês de referência (ainda não possuem cobrança). */
  const clientesSemTitulo = useMemo(
    () => clientes.filter((cliente) => cliente.status === "ATIVO" && !temTituloNoMes(cliente)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [clientes, chavesComTituloNoMes],
  );

  const clientesParaListar = useMemo(() => {
    const filtrados = clientes.filter((cliente) => {
      switch (filtroCliente) {
        case "ATIVOS":
          return cliente.status === "ATIVO";
        case "INATIVOS":
          return cliente.status === "INATIVO";
        case "SEM_TITULO":
          return cliente.status === "ATIVO" && !temTituloNoMes(cliente);
        default:
          return true;
      }
    });
    return filtrados.sort((a, b) => {
      switch (ordenacaoCliente) {
        case "VENCIMENTO":
          return a.vencimento - b.vencimento || a.razao_social.localeCompare(b.razao_social);
        case "VALOR":
          return valorContrato(b) - valorContrato(a);
        default:
          return a.razao_social.localeCompare(b.razao_social);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientes, filtroCliente, ordenacaoCliente, chavesComTituloNoMes]);

  function update<K extends keyof NovaAssinaturaValues>(key: K, value: NovaAssinaturaValues[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function buscarClientePorNome(nome: string): Cliente | undefined {
    const normalizado = nome.trim().toUpperCase();
    if (!normalizado) return undefined;
    const comparar = (cliente: Cliente) =>
      cliente.razao_social.trim().toUpperCase() === normalizado;
    // Prioriza a lista filtrada, mas ainda encontra um cliente fora do filtro
    // atual para não bloquear o auto-preenchimento (ex.: filtro "sem título").
    return clientesParaListar.find(comparar) ?? clientes.find(comparar);
  }

  function buscarClientePorCnpj(cnpj: string): Cliente | undefined {
    const digitos = onlyDigits(cnpj);
    if (digitos.length < 11) return undefined;
    const comparar = (cliente: Cliente) => onlyDigits(cliente.cnpj) === digitos;
    return clientesParaListar.find(comparar) ?? clientes.find(comparar);
  }

  /**
   * Auto-preenchimento: ao selecionar um cliente já cadastrado, preenche
   * CNPJ/CPF (se houver), telefone, valor mensal (contrato) e dia de
   * vencimento com os dados do cadastro.
   */
  function atualizarIdentificacao(campo: "cliente" | "cnpj", valor: string) {
    setForm((prev) => {
      const proximo = { ...prev, [campo]: valor, clienteId: null };
      // Busca apenas pelo campo alterado para não desfazer uma edição manual
      // usando o outro identificador que ainda pertence ao cliente anterior.
      const encontrado =
        campo === "cliente" ? buscarClientePorNome(valor) : buscarClientePorCnpj(valor);

      if (!encontrado) {
        return campo === "cliente" ? { ...proximo, cnpj: "", telefone: "" } : proximo;
      }

      return {
        ...proximo,
        clienteId: encontrado.id,
        cliente: encontrado.razao_social,
        cnpj: encontrado.cnpj,
        telefone: encontrado.telefone,
        valor: valorContrato(encontrado),
        vencimento: encontrado.vencimento,
      };
    });
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const cliente = form.cliente.trim();
    const mesAno = normalizeMesAno(form.mesAno);

    if (!cliente) {
      setErro("Informe o nome ou a razão social do cliente.");
      return;
    }
    if (!(Number(form.valor) > 0)) {
      setErro("Informe um valor mensal maior que zero.");
      return;
    }
    if (!mesAno) {
      setErro("Informe o mês/ano inicial no formato MM/AAAA.");
      return;
    }

    setErro("");
    void onSave({
      ...form,
      cliente: cliente.toUpperCase(),
      cnpj: form.cnpj.trim(),
      valor: Number(form.valor),
      vencimento: Math.min(31, Math.max(1, Number(form.vencimento) || 5)),
      mesAno,
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="size-5 text-brand" />
            Nova assinatura recorrente
          </DialogTitle>
          <DialogDescription>
            Cadastre um novo cliente ou vincule um cliente já existente ao fluxo de cobrança mensal.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4 text-sm">
          <div className="grid grid-cols-1 gap-3 rounded-2xl border border-border bg-muted/40 p-3.5 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="novaAssinaturaCliente">Cliente (nome / razão social) *</Label>
              <Input
                id="novaAssinaturaCliente"
                list="nova-assinatura-clientes"
                required
                value={form.cliente}
                onChange={(event) => atualizarIdentificacao("cliente", event.target.value)}
                placeholder="Digite para buscar ou cadastrar um novo cliente"
              />
              <datalist id="nova-assinatura-clientes">
                {clientesParaListar.map((cliente) => (
                  <option key={cliente.id} value={cliente.razao_social}>
                    {cliente.cnpj
                      ? `${cliente.razao_social} — ${cliente.cnpj}`
                      : cliente.razao_social}
                  </option>
                ))}
              </datalist>
              <p className="text-[11px] font-semibold text-muted-foreground">
                {clientesParaListar.length}{" "}
                {clientesParaListar.length === 1 ? "cliente na lista" : "clientes na lista"} ·{" "}
                {clientesSemTitulo.length} sem título em {mesAnoReferencia}
              </p>
              <label
                htmlFor="somenteSemTitulo"
                className="flex cursor-pointer items-center gap-2 rounded-xl border border-partner-border bg-partner-soft px-3 py-2 text-[12px] font-bold text-partner"
              >
                <Checkbox
                  id="somenteSemTitulo"
                  checked={filtroCliente === "SEM_TITULO"}
                  onCheckedChange={(checked) =>
                    setFiltroCliente(checked === true ? "SEM_TITULO" : "TODOS")
                  }
                />
                <span>
                  Somente “Sem título gerado” — {clientesSemTitulo.length}{" "}
                  {clientesSemTitulo.length === 1 ? "cliente" : "clientes"} ativo(s) sem título em{" "}
                  {mesAnoReferencia}
                </span>
              </label>
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="filtroClientes" className="text-[11px] text-muted-foreground">
                    Mostrar
                  </Label>
                  <select
                    id="filtroClientes"
                    className={selectClass}
                    value={filtroCliente}
                    onChange={(event) => setFiltroCliente(event.target.value as FiltroCliente)}
                  >
                    <option value="TODOS">Todos os clientes</option>
                    <option value="ATIVOS">Somente ativos</option>
                    <option value="INATIVOS">Somente inativos</option>
                    <option value="SEM_TITULO">Sem título gerado no mês</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="ordenacaoClientes" className="text-[11px] text-muted-foreground">
                    Ordenar por
                  </Label>
                  <select
                    id="ordenacaoClientes"
                    className={selectClass}
                    value={ordenacaoCliente}
                    onChange={(event) =>
                      setOrdenacaoCliente(event.target.value as OrdenacaoCliente)
                    }
                  >
                    <option value="NOME">Nome (A–Z)</option>
                    <option value="VENCIMENTO">Dia de vencimento</option>
                    <option value="VALOR">Maior mensalidade</option>
                  </select>
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground">
                {filtroCliente === "SEM_TITULO"
                  ? "A lista mostra apenas os clientes ativos que ainda não possuem cobrança no mês de referência. Ao escolher um cliente, CNPJ/CPF, mensalidade e vencimento são preenchidos a partir do cadastro."
                  : "Digite o nome ou o CNPJ para localizar um cliente já cadastrado. Se não encontrar, um novo cadastro será criado."}
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="novaAssinaturaCnpj">CNPJ / CPF</Label>
              <Input
                id="novaAssinaturaCnpj"
                inputMode="numeric"
                value={form.cnpj}
                onChange={(event) => atualizarIdentificacao("cnpj", event.target.value)}
                placeholder="Opcional"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="novaAssinaturaValor">Valor mensal (R$) *</Label>
              <Input
                id="novaAssinaturaValor"
                type="number"
                min="0.01"
                step="0.01"
                required
                value={form.valor}
                onChange={(event) => update("valor", Number(event.target.value))}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="novaAssinaturaVencimento">Dia do vencimento *</Label>
              <Input
                id="novaAssinaturaVencimento"
                type="number"
                min={1}
                max={31}
                required
                value={form.vencimento}
                onChange={(event) => update("vencimento", Number(event.target.value))}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="novaAssinaturaMesAno" className="flex items-center gap-1.5">
                <CalendarDays className="size-3.5 text-muted-foreground" />
                Mês/ano de início *
              </Label>
              <Input
                id="novaAssinaturaMesAno"
                required
                value={form.mesAno}
                onChange={(event) => update("mesAno", event.target.value)}
                placeholder="MM/AAAA"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="novaAssinaturaStatus">Status inicial *</Label>
              <select
                id="novaAssinaturaStatus"
                className={selectClass}
                value={form.status}
                onChange={(event) =>
                  update("status", event.target.value as NovaAssinaturaValues["status"])
                }
              >
                <option value="ATIVO">Ativa</option>
                <option value="CANCELADO">Cancelada</option>
              </select>
            </div>
          </div>

          {erro ? <p className="text-xs font-semibold text-destructive">{erro}</p> : null}

          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Salvando..." : "Adicionar assinatura"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

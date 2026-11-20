import { RotateCw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
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
import {
  chaveClienteDoTitulo,
  chaveDoCliente,
  formatCurrency,
  isActiveSubscription,
  nextMesAno,
  normalizeMesAno,
  parseNumber,
  type Titulo,
} from "@/lib/fincontrol";
import { valorContrato } from "@/lib/clientes";
import type { Cliente } from "@/lib/clientes";

export function RecorrenciaDialog({
  open,
  titulos,
  clientes,
  aliasesCnpj = [],
  mesReferencia,
  gerando,
  onOpenChange,
  onGerar,
}: {
  open: boolean;
  titulos: Titulo[];
  clientes: Cliente[];
  aliasesCnpj?: Array<{ cliente_id?: string | null; cnpj: string }>;
  mesReferencia?: string;
  gerando: boolean;
  onOpenChange: (open: boolean) => void;
  onGerar: (mesAnoInicial: string, quantidade: number, chavesSelecionadas?: string[]) => void;
}) {
  const mesInicialPadrao = mesReferencia
    ? normalizeMesAno(mesReferencia) || nextMesAno()
    : nextMesAno();
  const [mesAno, setMesAno] = useState(mesInicialPadrao);
  const [quantidade, setQuantidade] = useState(1);
  const [mostrarFaltantes, setMostrarFaltantes] = useState(false);
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (open) {
      setMesAno(mesInicialPadrao);
      setMostrarFaltantes(false);
      setSelecionados(new Set());
    }
  }, [open, mesInicialPadrao]);

  // Mesma regra do painel de assinaturas: cliente ATIVO sem nenhum título
  // recorrente conta como ativo (ele será gerado no clique em gerar).
  const chavesComTitulo = new Set(
    titulos
      .filter((t) => t.tipo_cobranca === "RECORRENTE")
      .map((t) => chaveClienteDoTitulo(t, clientes, aliasesCnpj)),
  );

  type AssinaturaAtiva = { chave: string; nome: string; cnpj: string; valor: number; diaVencimento: number };
  const assinaturasAtivas = useMemo<AssinaturaAtiva[]>(() => {
    const mapa = new Map<string, AssinaturaAtiva>();

    titulos
      .filter(isActiveSubscription)
      .forEach((t) => {
        const clienteTitulo = clientes.find(
          (c) =>
            c.id === t.cliente_id ||
            (t.cnpj || "").replace(/\D/g, "") === (c.cnpj || "").replace(/\D/g, ""),
        );
        if (clienteTitulo?.nao_gerar_assinatura) return;
        const chave = chaveClienteDoTitulo(t, clientes, aliasesCnpj);
        if (mapa.has(chave)) return;
        mapa.set(chave, {
          chave,
          nome: clienteTitulo?.razao_social || t.cliente,
          cnpj: clienteTitulo?.cnpj || t.cnpj,
          valor: parseNumber(t.mensal_site),
          diaVencimento: t.vencimento,
        });
      });

    clientes
      .filter(
        (c) =>
          c.status === "ATIVO" &&
          !c.nao_gerar_assinatura &&
          !chavesComTitulo.has(chaveDoCliente(c)),
      )
      .forEach((c) => {
        const chave = chaveDoCliente(c);
        if (mapa.has(chave)) return;
        mapa.set(chave, {
          chave,
          nome: c.razao_social,
          cnpj: c.cnpj,
          valor: valorContrato(c),
          diaVencimento: c.vencimento,
        });
      });

    return [...mapa.values()];
  }, [titulos, clientes, chavesComTitulo]);

  const ativas = new Set<string>(assinaturasAtivas.map((a) => a.chave));
  const mesAnoNormalizado = normalizeMesAno(mesAno);
  const mesAnoInvalido = mesAno.trim().length > 0 && !mesAnoNormalizado;

  const existentesNoMes = useMemo(() => {
    if (!mesAnoNormalizado) return new Set<string>();
    const conjunto = new Set<string>();
    titulos.forEach((t) => {
      if (normalizeMesAno(t.mes_ano) !== mesAnoNormalizado) return;
      conjunto.add(chaveClienteDoTitulo(t, clientes, aliasesCnpj));
    });
    return conjunto;
  }, [titulos, clientes, aliasesCnpj, mesAnoNormalizado]);

  const faltantes = useMemo(
    () => assinaturasAtivas.filter((a) => !existentesNoMes.has(a.chave)),
    [assinaturasAtivas, existentesNoMes],
  );
  const jaLancadas = assinaturasAtivas.length - faltantes.length;

  useEffect(() => {
    setSelecionados(new Set(faltantes.map((a) => a.chave)));
  }, [faltantes]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Gerar mensalidades em lote</DialogTitle>
          <DialogDescription>
            Cria as cobranças dos meses escolhidos para as assinaturas ativas. Assinaturas
            canceladas são ignoradas e meses já gerados não são duplicados. O status da assinatura é
            controlado no painel Assinaturas.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 text-sm">
          <div className="space-y-1.5">
            <Label htmlFor="mesAnoInicial">Mês/ano inicial</Label>
            <Input
              id="mesAnoInicial"
              value={mesAno}
              onChange={(event) => setMesAno(event.target.value)}
              onBlur={() => {
                const normalizado = normalizeMesAno(mesAno);
                if (normalizado) setMesAno(normalizado);
              }}
              placeholder="Ex: 11/2026"
              aria-invalid={mesAnoInvalido}
              aria-describedby="mesAnoInicial-ajuda"
              className={`font-bold ${
                mesAnoInvalido ? "border-destructive focus-visible:ring-destructive" : ""
              }`}
            />
            {mesAnoInvalido ? (
              <p
                id="mesAnoInicial-ajuda"
                role="alert"
                className="text-[11px] font-semibold text-destructive"
              >
                Formato inválido. Use MM/AAAA, por exemplo 11/2026.
              </p>
            ) : (
              <p id="mesAnoInicial-ajuda" className="text-[11px] text-muted-foreground">
                Formato MM/AAAA. O campo já vem preenchido com o próximo mês.
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="qtd">Quantidade de meses</Label>
            <select
              id="qtd"
              className="h-10 w-full rounded-xl border border-input bg-card px-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-ring"
              value={quantidade}
              onChange={(event) => setQuantidade(Number(event.target.value))}
            >
              {Array.from({ length: 12 }, (_, index) => index + 1).map((meses) => (
                <option key={meses} value={meses}>
                  {meses === 1 ? "1 mês" : `${meses} meses`}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2 rounded-xl border border-partner-border bg-partner-soft p-3 text-[11px] text-partner">
            <p className="flex items-start gap-2">
              <RotateCw className="mt-0.5 size-3.5 shrink-0" />
              {mesAnoNormalizado ? (
                <>
                  <strong>{jaLancadas} já lançadas</strong> no mês {mesAnoNormalizado} •{" "}
                  <strong>{faltantes.length} novas mensalidades serão geradas</strong> (de{" "}
                  {assinaturasAtivas.length} assinaturas ativas).
                </>
              ) : (
                <>
                  Foram encontradas <strong>{assinaturasAtivas.length} assinaturas ativas</strong> prontas
                  para renovação contínua.
                </>
              )}
            </p>
            {mesAnoNormalizado && faltantes.length > 0 ? (
              <div className="space-y-1">
                <button
                  type="button"
                  className="text-[11px] font-semibold underline"
                  onClick={() => setMostrarFaltantes((v) => !v)}
                >
                  {mostrarFaltantes ? "Ocultar clientes faltantes" : "Ver clientes faltantes"}
                </button>
                {mostrarFaltantes ? (
                  <ul className="max-h-48 space-y-1 overflow-y-auto rounded-md border border-partner-border/60 bg-background/60 p-2">
                    {faltantes.map((a) => (
                      <li key={a.chave} className="flex items-center justify-between gap-2">
                        <input
                          type="checkbox"
                          className="size-3.5 shrink-0"
                          checked={selecionados.has(a.chave)}
                          onChange={(e) => {
                            setSelecionados((prev) => {
                              const next = new Set(prev);
                              if (e.target.checked) next.add(a.chave);
                              else next.delete(a.chave);
                              return next;
                            });
                          }}
                        />
                        <span className="min-w-0 flex-1 truncate">{a.nome}</span>
                        <span className="shrink-0 font-mono text-[10px]">{a.cnpj || "—"}</span>
                        <span className="shrink-0 text-[10px]">Dia {a.diaVencimento}</span>
                        <span className="shrink-0 font-bold">{formatCurrency(a.valor)}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            type="button"
            disabled={gerando || !mesAnoNormalizado}
            onClick={() => {
              if (mesAnoNormalizado) onGerar(mesAnoNormalizado, quantidade, [...selecionados]);
            }}
          >
            Gerar novas mensalidades
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

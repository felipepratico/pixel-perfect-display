import { CircleCheck, FileSpreadsheet, UploadCloud } from "lucide-react";
import { useState } from "react";
import type * as XLSX from "xlsx";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  autoMap,
  emptyMapping,
  readWorkbook,
  rowsToTitulos,
  sheetToRows,
  type Mapping,
  type SheetRow,
} from "@/lib/excel";
import { computeRow, currentMesAno, formatCurrency, type TituloInput } from "@/lib/fincontrol";

const FIELDS: Array<{ key: keyof Mapping; label: string; required?: boolean }> = [
  { key: "cliente", label: "Cliente", required: true },
  { key: "cnpj", label: "CNPJ" },
  { key: "telefone", label: "Telefone / WhatsApp" },
  { key: "mensal_site", label: "Mensal site (R$)", required: true },
  { key: "mensal_real", label: "Mensal real (R$)" },
  { key: "custo_boleto", label: "Custo boleto (R$)" },
  { key: "francisco_pct", label: "% Francisco" },
  { key: "vencimento", label: "Dia do vencimento" },
  { key: "situacao", label: "Situação" },
  { key: "mes_ano", label: "Mês / ano" },
];

export function ImportDialog({
  open,
  importando,
  onOpenChange,
  onImportar,
}: {
  open: boolean;
  importando: boolean;
  onOpenChange: (open: boolean) => void;
  onImportar: (rows: TituloInput[]) => void;
}) {
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [sheetName, setSheetName] = useState("");
  const [rows, setRows] = useState<SheetRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Mapping>(emptyMapping);
  const [mesAno, setMesAno] = useState(currentMesAno());
  const [erro, setErro] = useState("");

  function carregarAba(book: XLSX.WorkBook, name: string) {
    const parsed = sheetToRows(book, name);
    const cols = parsed.length > 0 ? Object.keys(parsed[0] as SheetRow) : [];
    setRows(parsed);
    setHeaders(cols);
    setMapping(autoMap(cols));
    setSheetName(name);
    if (parsed.length === 0) setErro("Esta aba está vazia. Escolha outra aba da planilha.");
    else setErro("");
  }

  async function handleFile(file: File | undefined) {
    if (!file) return;
    try {
      const buffer = await file.arrayBuffer();
      const book = readWorkbook(buffer);
      setWorkbook(book);
      const first = book.SheetNames.find((name) => sheetToRows(book, name).length > 0);
      carregarAba(book, first ?? book.SheetNames[0] ?? "");
    } catch {
      setErro("Não conseguimos ler este arquivo. Use .xlsx, .xls ou .csv.");
    }
  }

  const preview = rowsToTitulos(rows.slice(0, 5), mapping, mesAno);
  const prontos = rowsToTitulos(rows, mapping, mesAno);
  const podeImportar = Boolean(mapping.cliente) && prontos.length > 0;

  function reset() {
    setWorkbook(null);
    setRows([]);
    setHeaders([]);
    setMapping(emptyMapping);
    setErro("");
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!value) reset();
        onOpenChange(value);
      }}
    >
      <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Importar planilha Excel</DialogTitle>
          <DialogDescription>
            Reconhecemos automaticamente colunas como cliente, CNPJ, mensal site, vencimento e
            situação.
          </DialogDescription>
        </DialogHeader>

        <label className="group flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-input bg-muted/40 p-6 text-center transition hover:border-brand">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-brand-soft text-brand">
            <UploadCloud className="size-6" />
          </span>
          <span className="text-sm font-bold">
            Clique para selecionar o arquivo (.XLSX / .XLS / .CSV)
          </span>
          <span className="text-xs text-muted-foreground">
            Sua planilha de contas a receber funciona direto, sem ajustes.
          </span>
          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={(event) => void handleFile(event.target.files?.[0])}
          />
        </label>

        {erro ? (
          <p className="rounded-xl border border-destructive/30 bg-danger-soft p-3 text-xs font-semibold text-destructive">
            {erro}
          </p>
        ) : null}

        {workbook && workbook.SheetNames.length > 0 ? (
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <span className="flex items-center gap-1 font-bold">
              <FileSpreadsheet className="size-3.5 text-brand" />
              Aba:
            </span>
            <select
              className="rounded-xl border border-input bg-card px-2.5 py-1.5 font-semibold"
              value={sheetName}
              onChange={(event) => carregarAba(workbook, event.target.value)}
            >
              {workbook.SheetNames.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
            <span className="text-muted-foreground">{rows.length} linhas encontradas</span>
          </div>
        ) : null}

        {headers.length > 0 ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {FIELDS.map((field) => (
                <div key={field.key} className="space-y-1">
                  <Label className="text-xs">
                    {field.label}
                    {field.required ? " *" : ""}
                  </Label>
                  <select
                    className="h-9 w-full rounded-xl border border-input bg-card px-2 text-xs"
                    value={mapping[field.key]}
                    onChange={(event) =>
                      setMapping((prev) => ({ ...prev, [field.key]: event.target.value }))
                    }
                  >
                    <option value="">— não usar —</option>
                    {headers.map((header) => (
                      <option key={header} value={header}>
                        {header}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
              <div className="space-y-1">
                <Label className="text-xs" htmlFor="mesAnoImport">
                  Mês/ano para linhas sem data
                </Label>
                <Input
                  id="mesAnoImport"
                  className="h-9 text-xs"
                  value={mesAno}
                  onChange={(event) => setMesAno(event.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-bold">Pré-visualização (5 primeiras linhas)</p>
              <div className="scroll-slim max-h-44 overflow-auto rounded-xl border border-border">
                <table className="w-full whitespace-nowrap text-left text-xs">
                  <thead className="bg-muted font-bold">
                    <tr>
                      <th className="p-2">Cliente</th>
                      <th className="p-2 text-right">Mensal site</th>
                      <th className="p-2 text-right">Lucro Francisco</th>
                      <th className="p-2 text-right">Lucro Felipe</th>
                      <th className="p-2 text-center">Situação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {preview.map((item, index) => {
                      const calc = computeRow(item);
                      return (
                        <tr key={`${item.cliente}-${index}`}>
                          <td className="p-2 font-semibold">{item.cliente}</td>
                          <td className="p-2 text-right">{formatCurrency(calc.mensalSite)}</td>
                          <td className="p-2 text-right text-partner">
                            {formatCurrency(calc.lucroFrancisco)}
                          </td>
                          <td className="p-2 text-right text-brand">
                            {formatCurrency(calc.lucroFelipe)}
                          </td>
                          <td className="p-2 text-center">{item.situacao}</td>
                        </tr>
                      );
                    })}
                    {preview.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-3 text-center text-muted-foreground">
                          Escolha ao menos a coluna do cliente.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>

            <Button
              type="button"
              className="w-full"
              disabled={!podeImportar || importando}
              onClick={() => onImportar(prontos)}
            >
              <CircleCheck className="size-4" />
              Importar {prontos.length} lançamentos
            </Button>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

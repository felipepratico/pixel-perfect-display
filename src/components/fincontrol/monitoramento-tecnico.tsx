import {
  AlertTriangle,
  Calendar,
  Database,
  MessageCircle,
  Pencil,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  ShieldOff,
  Trash2,
  WifiOff,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { ClienteDialog } from "@/components/fincontrol/cliente-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { diasAte, diasDesde, type ClienteInput } from "@/lib/clientes";
import type { Cliente } from "@/lib/clientes";
import { useClienteMutations, useGrupos } from "@/lib/use-clientes";

// ─── Mock data ────────────────────────────────────────────────────────────────
const hoje = new Date();
function addDias(d: number) {
  const r = new Date(hoje);
  r.setDate(r.getDate() + d);
  return r.toISOString().slice(0, 10);
}

export const MOCK_CLIENTES: Cliente[] = [
  {
    id: "m1",
    grupo_id: null,
    razao_social: "PADARIA PÃO DE MEL LTDA",
    nome_fantasia: "Pão de Mel",
    cnpj: "12.345.678/0001-90",
    email: "contato@paodemel.com",
    telefone: "5511999001001",
    endereco: "Rua das Flores, 100",
    numero_endereco: "100",
    bairro: "Centro",
    cep: "01310-100",
    cidade: "São Paulo",
    uf: "SP",
    plano: "BÁSICO",
    valor_base: 80,
    quantidade_computadores: 2,
    valor_computador_adicional: 30,
    modulos: ["PRÁTICO"],
    vencimento: 5,
    rede_vpn: "vpn-paodemel",
    ultimo_backup: addDias(-35),
    versao_instalada: "2026.08",
    data_ultima_atualizacao: addDias(-60),
    tipo_certificado: "A1",
    validade_certificado: addDias(10),
    chave_pix: "",
    observacoes: "",
    status: "ATIVO",
    deleted_at: null,
    created_at: "2024-01-01",
    updated_at: "2024-01-01",
  },
  {
    id: "m2",
    grupo_id: null,
    razao_social: "FARMÁCIA SAÚDE TOTAL ME",
    nome_fantasia: "Saúde Total",
    cnpj: "98.765.432/0001-11",
    email: "ti@saudetotal.com",
    telefone: "5511988002002",
    endereco: "Av. Brasil, 200",
    numero_endereco: "200",
    bairro: "Jardim América",
    cep: "01438-000",
    cidade: "São Paulo",
    uf: "SP",
    plano: "COMPLETO",
    valor_base: 150,
    quantidade_computadores: 5,
    valor_computador_adicional: 25,
    modulos: ["PRÁTICO", "NF-E", "PDV"],
    vencimento: 10,
    rede_vpn: "vpn-saudetotal",
    ultimo_backup: addDias(-12),
    versao_instalada: "2026.09",
    data_ultima_atualizacao: addDias(-5),
    tipo_certificado: "A3",
    validade_certificado: addDias(-5),
    chave_pix: "",
    observacoes: "",
    status: "ATIVO",
    deleted_at: null,
    created_at: "2024-01-01",
    updated_at: "2024-01-01",
  },
  {
    id: "m3",
    grupo_id: null,
    razao_social: "MERCADO BOAS COMPRAS EIRELI",
    nome_fantasia: "Boas Compras",
    cnpj: "11.222.333/0001-44",
    email: "admin@boacompras.com",
    telefone: "5521977003003",
    endereco: "Travessa Dom Pedro, 300",
    numero_endereco: "300",
    bairro: "Lapa",
    cep: "05077-000",
    cidade: "Rio de Janeiro",
    uf: "RJ",
    plano: "BÁSICO",
    valor_base: 80,
    quantidade_computadores: 1,
    valor_computador_adicional: 0,
    modulos: ["PRÁTICO", "PDV"],
    vencimento: 15,
    rede_vpn: "vpn-boacompras",
    ultimo_backup: null,
    versao_instalada: "2026.07",
    data_ultima_atualizacao: addDias(-90),
    tipo_certificado: "",
    validade_certificado: null,
    chave_pix: "",
    observacoes: "",
    status: "ATIVO",
    deleted_at: null,
    created_at: "2024-01-01",
    updated_at: "2024-01-01",
  },
  {
    id: "m4",
    grupo_id: null,
    razao_social: "LOJA DE ROUPAS FASHION TREND LTDA",
    nome_fantasia: "Fashion Trend",
    cnpj: "44.555.666/0001-77",
    email: "ti@fashiontrend.com",
    telefone: "5541966004004",
    endereco: "Rua XV de Novembro, 400",
    numero_endereco: "400",
    bairro: "Centro",
    cep: "80020-310",
    cidade: "Curitiba",
    uf: "PR",
    plano: "COMPLETO",
    valor_base: 130,
    quantidade_computadores: 3,
    valor_computador_adicional: 30,
    modulos: ["PRÁTICO", "NF-E", "MOBILE (MESA/COMANDA)"],
    vencimento: 20,
    rede_vpn: "",
    ultimo_backup: addDias(-3),
    versao_instalada: "2026.09",
    data_ultima_atualizacao: addDias(-3),
    tipo_certificado: "A1",
    validade_certificado: addDias(25),
    chave_pix: "44555666000177",
    observacoes: "",
    status: "ATIVO",
    deleted_at: null,
    created_at: "2024-01-01",
    updated_at: "2024-01-01",
  },
  {
    id: "m5",
    grupo_id: null,
    razao_social: "DISTRIBUIDORA ALFA BETA COMERCIAL LTDA",
    nome_fantasia: "Alfa Beta",
    cnpj: "77.888.999/0001-00",
    email: "suporte@alfabeta.com",
    telefone: "5551955005005",
    endereco: "Rua Júlio de Castilhos, 500",
    numero_endereco: "500",
    bairro: "Moinhos de Vento",
    cep: "90035-000",
    cidade: "Porto Alegre",
    uf: "RS",
    plano: "COMPLETO",
    valor_base: 200,
    quantidade_computadores: 8,
    valor_computador_adicional: 20,
    modulos: ["PRÁTICO", "NF-E", "PDV", "PDVNF-E"],
    vencimento: 5,
    rede_vpn: "vpn-alfabeta",
    ultimo_backup: addDias(-18),
    versao_instalada: "2026.09",
    data_ultima_atualizacao: addDias(-2),
    tipo_certificado: "A3",
    validade_certificado: addDias(60),
    chave_pix: "77888999000100",
    observacoes: "",
    status: "ATIVO",
    deleted_at: null,
    created_at: "2024-01-01",
    updated_at: "2024-01-01",
  },
  {
    id: "m6",
    grupo_id: null,
    razao_social: "AÇOUGUE E MERCEARIA DO ZÉ LTDA",
    nome_fantasia: "Mercearia do Zé",
    cnpj: "22.333.444/0001-55",
    email: "",
    telefone: "5581944006006",
    endereco: "Rua da Palha, 600",
    numero_endereco: "600",
    bairro: "Boa Vista",
    cep: "50060-000",
    cidade: "Recife",
    uf: "PE",
    plano: "BÁSICO",
    valor_base: 80,
    quantidade_computadores: 1,
    valor_computador_adicional: 0,
    modulos: ["PRÁTICO"],
    vencimento: 10,
    rede_vpn: "",
    ultimo_backup: addDias(-45),
    versao_instalada: "2026.06",
    data_ultima_atualizacao: addDias(-120),
    tipo_certificado: "A1",
    validade_certificado: addDias(-20),
    chave_pix: "",
    observacoes: "",
    status: "INATIVO",
    deleted_at: null,
    created_at: "2024-01-01",
    updated_at: "2024-01-01",
  },
  {
    id: "m7",
    grupo_id: null,
    razao_social: "RESTAURANTE E PIZZARIA BELLA NAPOLI LTDA",
    nome_fantasia: "Bella Napoli",
    cnpj: "33.444.555/0001-66",
    email: "financeiro@bellanapoli.com",
    telefone: "5562933007007",
    endereco: "Av. Goiás, 700",
    numero_endereco: "700",
    bairro: "Setor Central",
    cep: "74010-010",
    cidade: "Goiânia",
    uf: "GO",
    plano: "COMPLETO",
    valor_base: 160,
    quantidade_computadores: 4,
    valor_computador_adicional: 25,
    modulos: ["PRÁTICO", "MOBILE (MESA/COMANDA)", "MOBILE PEDIDO"],
    vencimento: 15,
    rede_vpn: "vpn-bellanapoli",
    ultimo_backup: addDias(-2),
    versao_instalada: "2026.09",
    data_ultima_atualizacao: addDias(-2),
    tipo_certificado: "A3",
    validade_certificado: addDias(15),
    chave_pix: "33444555000166",
    observacoes: "",
    status: "ATIVO",
    deleted_at: null,
    created_at: "2024-01-01",
    updated_at: "2024-01-01",
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
type DiasRegraBackup = 10 | 30 | 7 | "todos";

function formatData(iso: string | null) {
  if (!iso) return "Não informado";
  return iso.split("-").reverse().join("/");
}

function formatTelefone(tel: string) {
  return tel.replace(/\D/g, "");
}

function encodeWhatsApp(tel: string, msg: string) {
  const num = formatTelefone(tel);
  if (!num) return "#";
  return `https://wa.me/${num}?text=${encodeURIComponent(msg)}`;
}

// ─── Aba Backup ───────────────────────────────────────────────────────────────
type AbaBackupProps = { clientes: Cliente[]; onEditar: (cliente: Cliente) => void; onExcluir: (cliente: Cliente) => void };

function BadgeDias({ dias }: { dias: number | null }) {
  if (dias === null)
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-zinc-800 px-2.5 py-0.5 text-xs font-bold text-zinc-400">
        <WifiOff className="size-3" /> Sem registro
      </span>
    );
  if (dias > 30)
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-950/70 px-2.5 py-0.5 text-xs font-bold text-red-400 ring-1 ring-red-500/30">
        <AlertTriangle className="size-3" /> {dias} dias
      </span>
    );
  if (dias > 10)
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-orange-950/70 px-2.5 py-0.5 text-xs font-bold text-orange-400 ring-1 ring-orange-500/30">
        <AlertTriangle className="size-3" /> {dias} dias
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-950/70 px-2.5 py-0.5 text-xs font-bold text-emerald-400">
      {dias} dias
    </span>
  );
}

function AbaBackup({ clientes, onEditar, onExcluir }: AbaBackupProps) {
  const [busca, setBusca] = useState("");
  const [statusFiltro, setStatusFiltro] = useState<"all" | "ATIVO" | "INATIVO">("ATIVO");
  const [diasRegra, setDiasRegra] = useState<DiasRegraBackup>(10);
  const [selecionado, setSelecionado] = useState<string | null>(null);

  const filtrados = useMemo(() => {
    const termo = busca.trim().toUpperCase();
    return clientes.filter((c) => {
      if (statusFiltro !== "all" && c.status !== statusFiltro) return false;
      const dias = diasDesde(c.ultimo_backup);
      if (diasRegra !== "todos") {
        if (dias === null || dias > diasRegra) {
          // ok — cliente atende ao critério de atraso
        } else {
          return false;
        }
      }
      if (termo) {
        const texto = `${c.razao_social} ${c.nome_fantasia} ${c.cnpj}`.toUpperCase();
        if (!texto.includes(termo)) return false;
      }
      return true;
    });
  }, [clientes, busca, statusFiltro, diasRegra]);

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            className="pl-9 bg-card border-border/60 h-9"
            placeholder="Buscar por Razão Social ou CNPJ…"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>
        <select
          className="h-9 rounded-md border border-border/60 bg-card px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          value={statusFiltro}
          onChange={(e) => setStatusFiltro(e.target.value as "all" | "ATIVO" | "INATIVO")}
          aria-label="Filtrar por status do cliente"
        >
          <option value="all">Todos os status</option>
          <option value="ATIVO">Ativos</option>
          <option value="INATIVO">Inativos</option>
        </select>
        <select
          className="h-9 rounded-md border border-border/60 bg-card px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          value={String(diasRegra)}
          onChange={(e) => {
            const v = e.target.value;
            setDiasRegra(v === "todos" ? "todos" : (Number(v) as DiasRegraBackup));
          }}
          aria-label="Regra de dias de atraso"
        >
          <option value="7">Mais de 7 dias</option>
          <option value="10">Mais de 10 dias</option>
          <option value="30">Mais de 30 dias</option>
          <option value="todos">Todos os clientes</option>
        </select>
      </div>

      {/* Contador */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Database className="size-4 text-orange-400" />
        <span>
          <strong className="text-foreground">{filtrados.length}</strong> cliente(s) com
          backup em atraso
        </span>
      </div>
      <p className="text-xs text-muted-foreground">Clique em um cliente e pressione Enter para editar.</p>

      {/* Tabela */}
      <div className="overflow-hidden rounded-xl border border-border/60 bg-card">
        <div className="scroll-slim overflow-x-auto">
          <table className="w-full whitespace-nowrap text-left text-sm">
            <thead>
              <tr className="border-b border-border/60 bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3">Razão Social / Nome Fantasia</th>
                <th className="px-4 py-3">CNPJ / WhatsApp</th>
                <th className="px-4 py-3">Último Backup</th>
                <th className="px-4 py-3 text-center">Dias sem Backup</th>
                <th className="px-4 py-3">Versão Instalada</th>
                <th className="px-4 py-3 text-center">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {filtrados.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                    <div className="flex flex-col items-center gap-2">
                      <Database className="size-8 opacity-30" />
                      <p className="font-semibold text-foreground">Nenhum cliente em atraso</p>
                      <p className="text-xs">Ajuste os filtros para ampliar a busca.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtrados.map((c) => {
                  const dias = diasDesde(c.ultimo_backup);
                  const exemplo = MOCK_CLIENTES.some((m) => m.id === c.id);
                  const msgWhats = `Olá ${c.nome_fantasia || c.razao_social}, identificamos que o último backup do seu sistema Prático foi realizado em ${formatData(c.ultimo_backup)} (há mais de ${dias ?? "vários"} dias). Para garantir a segurança dos seus dados e evitar perdas, por favor, realize a cópia de segurança o quanto antes. Se precisar de suporte, estamos à disposição!`;
                  return (
                    <tr
                      key={c.id}
                      tabIndex={exemplo ? -1 : 0}
                      className={`group transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/60 ${selecionado === c.id ? "bg-muted/60" : ""}`}
                      onClick={() => setSelecionado(c.id)}
                      onKeyDown={(e) => {
                        if (e.key !== "Enter" || exemplo) return;
                        if ((e.target as HTMLElement).closest("a,button,input,select,textarea")) return;
                        e.preventDefault();
                        onEditar(c);
                      }}
                    >
                      <td className="px-4 py-3">
                        <p className="font-semibold text-foreground">{c.razao_social}</p>
                        {c.nome_fantasia && (
                          <p className="text-xs text-muted-foreground">{c.nome_fantasia}</p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-mono text-xs text-foreground">{c.cnpj || "—"}</p>
                        <p className="text-xs text-muted-foreground">{c.telefone || "Sem WhatsApp"}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1.5 text-xs">
                          <Calendar className="size-3.5 text-muted-foreground" />
                          {formatData(c.ultimo_backup)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <BadgeDias dias={dias} />
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant="outline"
                          className="font-mono text-xs border-zinc-700 text-zinc-400"
                        >
                          {c.versao_instalada || "Não informada"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="size-8"
                            title="Editar cliente"
                            disabled={exemplo}
                            onClick={(e) => { e.stopPropagation(); onEditar(c); }}
                          >
                            <Pencil className="size-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="size-8 text-destructive"
                            title="Mover para a lixeira"
                            disabled={exemplo}
                            onClick={(e) => { e.stopPropagation(); onExcluir(c); }}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                          {c.telefone ? (
                            <a
                              href={encodeWhatsApp(c.telefone, msgWhats)}
                              target="_blank"
                              rel="noopener noreferrer"
                              aria-label={`Notificar ${c.razao_social} via WhatsApp`}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Button
                                size="sm"
                                className="gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold h-8 px-3 shadow-sm"
                              >
                                <MessageCircle className="size-3.5" />
                                WhatsApp
                              </Button>
                            </a>
                          ) : (
                            <span className="text-xs text-muted-foreground">Sem número</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Aba Certificado ──────────────────────────────────────────────────────────
type AbaCertificadoProps = { clientes: Cliente[]; onEditar: (cliente: Cliente) => void; onExcluir: (cliente: Cliente) => void };

function BadgeCertificado({ dias }: { dias: number | null }) {
  if (dias === null)
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-zinc-800 px-2.5 py-0.5 text-xs font-bold text-zinc-400">
        <Shield className="size-3" /> Não informado
      </span>
    );
  if (dias < 0)
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-950/70 px-2.5 py-0.5 text-xs font-bold text-red-400 ring-1 ring-red-500/30">
        <ShieldOff className="size-3" /> Vencido há {Math.abs(dias)} dias
      </span>
    );
  if (dias <= 30)
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-yellow-950/70 px-2.5 py-0.5 text-xs font-bold text-yellow-400 ring-1 ring-yellow-500/30">
        <ShieldAlert className="size-3" /> Vence em {dias} dias
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-950/70 px-2.5 py-0.5 text-xs font-bold text-emerald-400">
      <ShieldCheck className="size-3" /> {dias} dias
    </span>
  );
}

function AbaCertificado({ clientes, onEditar, onExcluir }: AbaCertificadoProps) {
  const [busca, setBusca] = useState("");
  const [tipoCert, setTipoCert] = useState<"all" | "A1" | "A3" | "">("all");
  const [apenasAlerta, setApenasAlerta] = useState(true);
  const [selecionado, setSelecionado] = useState<string | null>(null);

  const filtrados = useMemo(() => {
    const termo = busca.trim().toUpperCase();
    return clientes.filter((c) => {
      if (tipoCert !== "all" && c.tipo_certificado !== tipoCert) return false;
      if (apenasAlerta) {
        const dias = diasAte(c.validade_certificado);
        // inclui: sem certificado informado, vencidos ou vencendo em até 30 dias
        if (c.validade_certificado && dias !== null && dias > 30) return false;
      }
      if (termo) {
        const texto = `${c.razao_social} ${c.nome_fantasia} ${c.cnpj}`.toUpperCase();
        if (!texto.includes(termo)) return false;
      }
      return true;
    });
  }, [clientes, busca, tipoCert, apenasAlerta]);

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            className="pl-9 bg-card border-border/60 h-9"
            placeholder="Buscar por cliente…"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>
        <select
          className="h-9 rounded-md border border-border/60 bg-card px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          value={tipoCert}
          onChange={(e) => setTipoCert(e.target.value as "all" | "A1" | "A3" | "")}
          aria-label="Filtrar por tipo de certificado"
        >
          <option value="all">Todos os tipos</option>
          <option value="A1">A1</option>
          <option value="A3">A3</option>
          <option value="">Não informado</option>
        </select>
        <button
          onClick={() => setApenasAlerta((v) => !v)}
          className={`h-9 rounded-md border px-3 text-sm font-semibold transition-colors ${
            apenasAlerta
              ? "border-yellow-500/40 bg-yellow-950/40 text-yellow-400"
              : "border-border/60 bg-card text-muted-foreground hover:text-foreground"
          }`}
          aria-pressed={apenasAlerta}
        >
          <ShieldAlert className="inline size-3.5 mr-1.5" />
          {apenasAlerta ? "Apenas alertas" : "Todos os clientes"}
        </button>
      </div>

      {/* Contador */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <ShieldAlert className="size-4 text-yellow-400" />
        <span>
          <strong className="text-foreground">{filtrados.length}</strong> cliente(s)
          com certificado vencido ou a vencer
        </span>
      </div>
      <p className="text-xs text-muted-foreground">Clique em um cliente e pressione Enter para editar.</p>

      {/* Tabela */}
      <div className="overflow-hidden rounded-xl border border-border/60 bg-card">
        <div className="scroll-slim overflow-x-auto">
          <table className="w-full whitespace-nowrap text-left text-sm">
            <thead>
              <tr className="border-b border-border/60 bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3">Razão Social / CNPJ</th>
                <th className="px-4 py-3 text-center">Tipo</th>
                <th className="px-4 py-3">Validade do Certificado</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-center">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {filtrados.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">
                    <div className="flex flex-col items-center gap-2">
                      <ShieldCheck className="size-8 opacity-30" />
                      <p className="font-semibold text-foreground">Nenhum alerta de certificado</p>
                      <p className="text-xs">Todos os certificados estão dentro do prazo.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtrados.map((c) => {
                  const dias = diasAte(c.validade_certificado);
                  const exemplo = MOCK_CLIENTES.some((m) => m.id === c.id);
                  const status =
                    dias === null
                      ? "não informado"
                      : dias < 0
                      ? `vencido há ${Math.abs(dias)} dias`
                      : `a vencer em ${dias} dias`;
                  const msgWhats = `Olá ${c.nome_fantasia || c.razao_social}, verificamos que o seu certificado digital ${c.tipo_certificado || ""} ${dias !== null && dias < 0 ? `está VENCIDO desde ${formatData(c.validade_certificado)}` : `vence em ${formatData(c.validade_certificado)} (em ${dias} dias)`}. Para evitar problemas na emissão de notas fiscais e operações fiscais, recomendamos a renovação o quanto antes. Qualquer dúvida, estamos à disposição!`;
                  return (
                    <tr
                      key={c.id}
                      tabIndex={exemplo ? -1 : 0}
                      className={`group transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/60 ${selecionado === c.id ? "bg-muted/60" : ""}`}
                      onClick={() => setSelecionado(c.id)}
                      onKeyDown={(e) => {
                        if (e.key !== "Enter" || exemplo) return;
                        if ((e.target as HTMLElement).closest("a,button,input,select,textarea")) return;
                        e.preventDefault();
                        onEditar(c);
                      }}
                    >
                      <td className="px-4 py-3">
                        <p className="font-semibold text-foreground">{c.razao_social}</p>
                        <p className="font-mono text-xs text-muted-foreground">{c.cnpj || "CNPJ não informado"}</p>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {c.tipo_certificado ? (
                          <Badge
                            variant="outline"
                            className={`text-xs font-bold ${
                              c.tipo_certificado === "A1"
                                ? "border-sky-500/40 text-sky-400"
                                : "border-purple-500/40 text-purple-400"
                            }`}
                          >
                            {c.tipo_certificado}
                          </Badge>
                        ) : (
                          <span className="text-xs text-zinc-500">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1.5 text-xs">
                          <Calendar className="size-3.5 text-muted-foreground" />
                          {formatData(c.validade_certificado)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <BadgeCertificado dias={dias} />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="size-8"
                            title="Editar cliente"
                            disabled={exemplo}
                            onClick={(e) => { e.stopPropagation(); onEditar(c); }}
                          >
                            <Pencil className="size-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="size-8 text-destructive"
                            title="Mover para a lixeira"
                            disabled={exemplo}
                            onClick={(e) => { e.stopPropagation(); onExcluir(c); }}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                          {c.telefone ? (
                            <a
                              href={encodeWhatsApp(c.telefone, msgWhats)}
                              target="_blank"
                              rel="noopener noreferrer"
                              aria-label={`Notificar ${c.razao_social} sobre certificado via WhatsApp`}
                              title={status}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Button
                                size="sm"
                                className="gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold h-8 px-3 shadow-sm"
                              >
                                <MessageCircle className="size-3.5" />
                                WhatsApp
                              </Button>
                            </a>
                          ) : (
                            <span className="text-xs text-muted-foreground">Sem número</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────
type Tab = "backup" | "certificado";

type MonitoramentoTecnicoProps = {
  clientes?: Cliente[];
};

export function MonitoramentoTecnico({ clientes = MOCK_CLIENTES }: MonitoramentoTecnicoProps) {
  const [aba, setAba] = useState<Tab>("backup");
  const { data: grupos = [] } = useGrupos();
  const { createGrupo, saveCliente, softDeleteCliente } = useClienteMutations();
  const [open, setOpen] = useState(false);
  const [editando, setEditando] = useState<Cliente | null>(null);

  function salvar(values: ClienteInput, id?: string) {
    const payload = id ? { id, values } : { values };
    saveCliente.mutate(payload, { onSuccess: () => { toast.success("Cliente salvo."); setOpen(false); }, onError: (e) => toast.error(e.message) });
  }

  function editar(cliente: Cliente) {
    setEditando(cliente);
    setOpen(true);
  }

  function excluir(cliente: Cliente) {
    if (!confirm(`Mover ${cliente.razao_social} para a lixeira?`)) return;
    softDeleteCliente.mutate(cliente.id, { onSuccess: () => toast.success("Cliente movido para a lixeira."), onError: (e) => toast.error(e.message) });
  }

  const totalBackupAtrasado = useMemo(
    () =>
      clientes.filter((c) => {
        const d = diasDesde(c.ultimo_backup);
        return d === null || d > 10;
      }).length,
    [clientes],
  );
  const totalCertAlerta = useMemo(
    () =>
      clientes.filter((c) => {
        const d = diasAte(c.validade_certificado);
        return d === null || d <= 30;
      }).length,
    [clientes],
  );

  return (
    <div className="space-y-6">
      {/* Cards de resumo */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <StatCard
          icon={Database}
          label="Backups atrasados"
          value={totalBackupAtrasado}
          tone="orange"
          desc="Clientes com mais de 10 dias sem backup"
        />
        <StatCard
          icon={ShieldAlert}
          label="Certificados em alerta"
          value={totalCertAlerta}
          tone="yellow"
          desc="Vencidos ou vencendo em até 30 dias"
        />
      </div>

      {/* Painel de abas */}
      <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
        <div className="flex border-b border-border/60 bg-muted/30">
          <TabBtn
            active={aba === "backup"}
            onClick={() => setAba("backup")}
            icon={<Database className="size-4" />}
            label="Backups Atrasados"
            badge={totalBackupAtrasado}
            badgeColor="bg-orange-500"
            id="tab-backup"
          />
          <TabBtn
            active={aba === "certificado"}
            onClick={() => setAba("certificado")}
            icon={<ShieldAlert className="size-4" />}
            label="Certificados Digitais"
            badge={totalCertAlerta}
            badgeColor="bg-yellow-500"
            id="tab-certificado"
          />
        </div>
        <div className="p-4">
          {aba === "backup" ? (
            <AbaBackup clientes={clientes} onEditar={editar} onExcluir={excluir} />
          ) : (
            <AbaCertificado clientes={clientes} onEditar={editar} onExcluir={excluir} />
          )}
        </div>
      </div>
      <ClienteDialog open={open} cliente={editando} grupos={grupos} saving={saveCliente.isPending} onOpenChange={setOpen} onCreateGrupo={(nome) => createGrupo.mutateAsync(nome)} onSave={salvar} />
    </div>
  );
}

// ─── Auxiliares ───────────────────────────────────────────────────────────────
function StatCard({
  icon: Icon,
  label,
  value,
  tone,
  desc,
}: {
  icon: typeof Database;
  label: string;
  value: number;
  tone: "orange" | "yellow" | "red" | "emerald";
  desc: string;
}) {
  const colors: Record<string, string> = {
    orange: "from-orange-950/60 border-orange-500/20 text-orange-400",
    yellow: "from-yellow-950/60 border-yellow-500/20 text-yellow-400",
    red: "from-red-950/60 border-red-500/20 text-red-400",
    emerald: "from-emerald-950/60 border-emerald-500/20 text-emerald-400",
  };
  const cls = colors[tone] ?? colors["orange"];
  return (
    <div className={`flex items-center gap-4 rounded-xl border bg-gradient-to-br to-card p-4 ${cls}`}>
      <div className={`rounded-lg bg-card/80 p-3 ${cls}`}>
        <Icon className="size-6" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-3xl font-extrabold text-foreground">{value}</p>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
    </div>
  );
}

function TabBtn({
  active,
  onClick,
  icon,
  label,
  badge,
  badgeColor,
  id,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  badge: number;
  badgeColor: string;
  id: string;
}) {
  return (
    <button
      id={id}
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`relative flex flex-1 items-center justify-center gap-2 px-4 py-3 text-sm font-semibold transition-colors ${
        active
          ? "border-b-2 border-primary text-foreground bg-card/50"
          : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
      }`}
    >
      {icon}
      <span>{label}</span>
      {badge > 0 && (
        <span className={`inline-flex items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-black text-white ${badgeColor}`}>
          {badge}
        </span>
      )}
    </button>
  );
}

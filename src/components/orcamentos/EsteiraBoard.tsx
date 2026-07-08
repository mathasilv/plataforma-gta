"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ESTACOES, estacaoLabel, type Estacao, type FonteOrcamento, type Orcamento } from "@/lib/orcamentos/types";
import type { PermissaoKey } from "@/lib/rbac/permissoes";
import { Badge, EmptyState, type Tone } from "@/components/ui";
import { formatBRL, parseNumber } from "@/lib/format";

const ESTACAO_TONE: Record<Estacao, Tone> = {
  rascunho: "slate",
  em_revisao: "amber",
  aprovado: "green",
  cancelado: "slate",
};

const FILTROS: { value: Estacao | "todos"; label: string }[] = [
  { value: "todos", label: "Todos" },
  ...ESTACOES.map((e) => ({ value: e.value, label: e.label })),
];

const FICHA_VAZIA = { custoBase: "", fator: "", faturamento: "", impostosPct: "", margemLiquida: "", observacoes: "" };

export function EsteiraBoard({ perms }: { perms: PermissaoKey[] }) {
  const pode = (k: PermissaoKey) => perms.includes(k);

  const [lista, setLista] = useState<Orcamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<Estacao | "todos">("todos");

  const [novoAberto, setNovoAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [form, setForm] = useState({ cliente: "", fonte: "interno" as FonteOrcamento, descricao: "", valor: "" });
  const [ficha, setFicha] = useState({ ...FICHA_VAZIA });

  async function carregar() {
    try {
      const res = await fetch("/api/orcamentos");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Falha ao carregar orçamentos.");
      setLista(data.orcamentos ?? []);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro.");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    carregar();
  }, []);

  const filtrada = useMemo(
    () => (filtro === "todos" ? lista : lista.filter((o) => o.estacao === filtro)),
    [lista, filtro],
  );

  const contagem = useMemo(() => {
    const m: Record<string, number> = {};
    for (const o of lista) m[o.estacao] = (m[o.estacao] ?? 0) + 1;
    return m;
  }, [lista]);

  async function criar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setSalvando(true);
    try {
      const payload: Record<string, unknown> = {
        cliente: form.cliente.trim(),
        fonte: form.fonte,
        descricao: form.descricao.trim(),
      };
      if (form.valor.trim()) payload.valor = parseNumber(form.valor);
      if (form.fonte === "externo") {
        payload.ficha = {
          custoBase: parseNumber(ficha.custoBase),
          fator: parseNumber(ficha.fator),
          faturamento: parseNumber(ficha.faturamento),
          impostosPct: parseNumber(ficha.impostosPct) / 100,
          margemLiquida: parseNumber(ficha.margemLiquida) / 100,
          observacoes: ficha.observacoes.trim() || undefined,
        };
      }
      const res = await fetch("/api/orcamentos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Falha ao criar orçamento.");
      setLista((prev) => [data.orcamento, ...prev]);
      setForm({ cliente: "", fonte: "interno", descricao: "", valor: "" });
      setFicha({ ...FICHA_VAZIA });
      setNovoAberto(false);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao criar.");
    } finally {
      setSalvando(false);
    }
  }

  if (loading) return <p className="text-sm text-slate-500 dark:text-slate-400">Carregando orçamentos...</p>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        {pode("orcamentos.criar") && (
          <button className="btn-primary" onClick={() => setNovoAberto((v) => !v)}>
            {novoAberto ? "Fechar" : "+ Novo orçamento"}
          </button>
        )}
        <div className="flex flex-wrap gap-1">
          {FILTROS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFiltro(f.value)}
              className={`rounded-md px-2.5 py-1 text-xs transition ${
                filtro === f.value
                  ? "bg-gta-navy text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"
              }`}
            >
              {f.label}
              {f.value !== "todos" && contagem[f.value] ? ` (${contagem[f.value]})` : ""}
            </button>
          ))}
        </div>
        <span className="ml-auto text-xs text-slate-400 dark:text-slate-500">{lista.length} orçamento(s)</span>
      </div>

      {erro && <p className="field-error">{erro}</p>}

      {novoAberto && pode("orcamentos.criar") && (
        <form onSubmit={criar} className="rounded-xl border border-gta-indigo/30 bg-white p-4 shadow-sm dark:bg-slate-800">
          <h2 className="mb-3 text-sm font-semibold text-gta-navy dark:text-slate-100">Novo orçamento</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-6">
            <div className="sm:col-span-3">
              <label className="field-label">Cliente *</label>
              <input className="field-input" value={form.cliente} onChange={(e) => setForm({ ...form, cliente: e.target.value })} required />
            </div>
            <div className="sm:col-span-2">
              <label className="field-label">Origem</label>
              <select className="field-input" value={form.fonte} onChange={(e) => setForm({ ...form, fonte: e.target.value as FonteOrcamento })}>
                <option value="interno">Interno (plataforma)</option>
                <option value="externo">Externo (arquivo)</option>
              </select>
            </div>
            <div className="sm:col-span-1">
              <label className="field-label">Valor (R$)</label>
              <input className="field-input" inputMode="decimal" value={form.valor} onChange={(e) => setForm({ ...form, valor: e.target.value })} placeholder="0,00" />
            </div>
            <div className="sm:col-span-6">
              <label className="field-label">Descrição</label>
              <input className="field-input" value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} placeholder="Ex.: Projeto de subestação + SPDA — Fazenda X" />
            </div>
          </div>

          {form.fonte === "externo" && (
            <div className="mt-4 rounded-lg bg-slate-50 p-3 dark:bg-slate-900/50">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                Ficha do orçamento externo
              </p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                <FichaNum label="Custo base (R$)" value={ficha.custoBase} onChange={(v) => setFicha({ ...ficha, custoBase: v })} />
                <FichaNum label="Fator" value={ficha.fator} onChange={(v) => setFicha({ ...ficha, fator: v })} placeholder="1,65" />
                <FichaNum label="Faturamento (R$)" value={ficha.faturamento} onChange={(v) => setFicha({ ...ficha, faturamento: v })} />
                <FichaNum label="Impostos (%)" value={ficha.impostosPct} onChange={(v) => setFicha({ ...ficha, impostosPct: v })} placeholder="7" />
                <FichaNum label="Margem líq. (%)" value={ficha.margemLiquida} onChange={(v) => setFicha({ ...ficha, margemLiquida: v })} placeholder="30" />
              </div>
              <div className="mt-3">
                <label className="field-label">Observações</label>
                <input className="field-input" value={ficha.observacoes} onChange={(e) => setFicha({ ...ficha, observacoes: e.target.value })} />
              </div>
              <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">
                O anexo do PDF/planilha entra na tela do orçamento (em breve).
              </p>
            </div>
          )}

          <div className="mt-3">
            <button type="submit" className="btn-primary" disabled={salvando || !form.cliente.trim()}>
              {salvando ? "Criando..." : "Criar orçamento"}
            </button>
          </div>
        </form>
      )}

      {filtrada.length === 0 ? (
        <EmptyState>Nenhum orçamento {filtro !== "todos" ? `em "${estacaoLabel(filtro as Estacao)}"` : "ainda"}.</EmptyState>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {filtrada.map((o) => (
            <Link key={o.id} href={`/esteira/${o.id}`} className="card block p-4 transition hover:shadow-md">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate font-medium text-gta-navy dark:text-slate-100">{o.cliente}</div>
                  <div className="truncate text-xs text-slate-400 dark:text-slate-500">{o.referencia}</div>
                </div>
                <Badge tone={ESTACAO_TONE[o.estacao]} className="shrink-0">{estacaoLabel(o.estacao)}</Badge>
              </div>
              {o.descricao && <p className="mt-1.5 line-clamp-2 text-sm text-slate-600 dark:text-slate-300">{o.descricao}</p>}
              <div className="mt-2 flex items-center justify-between text-xs">
                <span className="text-slate-400 dark:text-slate-500">{o.fonte === "externo" ? "Externo" : "Interno"}</span>
                {o.valor != null && <span className="font-semibold text-gta-navy dark:text-slate-100">{formatBRL(o.valor)}</span>}
              </div>
              {o.estacao === "aprovado" && o.decididoPor && (
                <p className="mt-1 text-xs text-green-700 dark:text-green-400">Aprovado por {o.decididoPor}</p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function FichaNum({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="field-label">{label}</label>
      <input className="field-input" inputMode="decimal" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}

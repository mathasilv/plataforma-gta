"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ESTACOES, estacaoLabel, type Estacao, type Orcamento } from "@/lib/orcamentos/types";
import { Badge, EmptyState, type Tone } from "@/components/ui";
import { usePaginacao, Paginacao } from "@/components/Paginacao";

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

export function AprovacoesBoard() {
  const [lista, setLista] = useState<Orcamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<Estacao | "todos">("todos");

  useEffect(() => {
    fetch("/api/orcamentos")
      .then((r) => r.json())
      .then((d) => setLista(d.orcamentos ?? []))
      .catch(() => setErro("Falha ao carregar orçamentos."))
      .finally(() => setLoading(false));
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

  const { paginados, controles } = usePaginacao(filtrada);

  if (loading) return <p className="subtitle">Carregando orçamentos...</p>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
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
        <span className="ml-auto hint">{lista.length} orçamento(s)</span>
      </div>

      {erro && <p className="field-error">{erro}</p>}

      {filtrada.length === 0 ? (
        <EmptyState>
          {filtro !== "todos"
            ? `Nenhum orçamento em "${estacaoLabel(filtro as Estacao)}".`
            : "Nenhum orçamento ainda. Envie uma proposta para aprovação em Propostas."}
        </EmptyState>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {paginados.map((o) => (
            <Link key={o.id} href={`/aprovacoes/${o.id}`} className="card block p-4 transition hover:shadow-md">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate font-medium text-gta-navy dark:text-slate-100">{o.cliente}</div>
                  <div className="truncate hint">{o.referencia}</div>
                </div>
                <Badge tone={ESTACAO_TONE[o.estacao]} className="shrink-0">{estacaoLabel(o.estacao)}</Badge>
              </div>
              {o.descricao && <p className="mt-1.5 line-clamp-2 text-sm text-slate-600 dark:text-slate-300">{o.descricao}</p>}
              {o.estacao === "aprovado" && o.decididoPor && (
                <p className="mt-2 text-xs text-green-700 dark:text-green-400">Aprovado por {o.decididoPor}</p>
              )}
            </Link>
          ))}
        </div>
      )}

      <Paginacao {...controles} />
    </div>
  );
}

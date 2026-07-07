"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ServiceIcon } from "@/components/ServiceIcon";
import { statusPropostaLabel, STATUS_PROPOSTA, type Proposta } from "@/lib/propostas/types";

const STATUS_BADGE: Record<string, string> = {
  rascunho: "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300",
  precificada: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  gerada: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
};

interface ServiceMeta {
  key: string;
  label: string;
  icon: string;
  usesConfigurator: boolean;
}

function fmtData(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR") + " " + d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

export function PropostasList() {
  const [propostas, setPropostas] = useState<Proposta[]>([]);
  const [services, setServices] = useState<ServiceMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  // filtros
  const [busca, setBusca] = useState("");
  const [fServico, setFServico] = useState("");
  const [fStatus, setFStatus] = useState("");
  const [fCriador, setFCriador] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/propostas").then((r) => r.json()),
      fetch("/api/services").then((r) => r.json()),
    ])
      .then(([p, s]) => {
        setPropostas(p.propostas ?? []);
        setServices(s.services ?? []);
      })
      .catch(() => setErro("Falha ao carregar."))
      .finally(() => setLoading(false));
  }, []);

  const serviceMap = useMemo(() => {
    const m = new Map<string, ServiceMeta>();
    services.forEach((s) => m.set(s.key, s));
    return m;
  }, [services]);

  const nomeCriador = (p: Proposta) => p.criadoPorNome || p.criadoPor || "—";

  // só mostra no filtro os serviços que têm propostas
  const servicosComPropostas = useMemo(() => {
    const keys = new Set(propostas.map((p) => p.serviceKey));
    return services.filter((s) => keys.has(s.key));
  }, [services, propostas]);

  const criadores = useMemo(() => {
    return Array.from(new Set(propostas.map(nomeCriador))).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [propostas]);

  const filtradas = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return propostas.filter((p) => {
      if (fServico && p.serviceKey !== fServico) return false;
      if (fStatus && p.status !== fStatus) return false;
      if (fCriador && nomeCriador(p) !== fCriador) return false;
      if (q) {
        const alvo = `${p.cliente} ${p.referencia}`.toLowerCase();
        if (!alvo.includes(q)) return false;
      }
      return true;
    });
  }, [propostas, busca, fServico, fStatus, fCriador]);

  async function excluir(p: Proposta) {
    if (!window.confirm(`Excluir a proposta de "${p.cliente}"?`)) return;
    const res = await fetch(`/api/propostas/${p.id}`, { method: "DELETE" });
    if (res.ok) setPropostas((prev) => prev.filter((x) => x.id !== p.id));
    else setErro("Falha ao excluir.");
  }

  function rotuloServico(key: string) {
    return serviceMap.get(key)?.label ?? key;
  }

  const limparFiltros = () => { setBusca(""); setFServico(""); setFStatus(""); setFCriador(""); };
  const temFiltro = busca || fServico || fStatus || fCriador;

  if (loading) return <p className="text-sm text-slate-500 dark:text-slate-400">Carregando propostas...</p>;

  const cardCls = "rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800";

  return (
    <div className="space-y-4">
      {erro && <p className="field-error">{erro}</p>}

      {/* Filtros */}
      <div className={`flex flex-wrap items-end gap-3 p-4 ${cardCls}`}>
        <div className="min-w-[200px] flex-1">
          <label className="field-label">Buscar cliente / referência</label>
          <input
            className="field-input"
            placeholder="Digite para filtrar..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>
        <div className="min-w-[170px]">
          <label className="field-label">Serviço</label>
          <select className="field-input" value={fServico} onChange={(e) => setFServico(e.target.value)}>
            <option value="">Todos</option>
            {servicosComPropostas.map((s) => (
              <option key={s.key} value={s.key}>{s.label}</option>
            ))}
          </select>
        </div>
        <div className="min-w-[150px]">
          <label className="field-label">Criador</label>
          <select className="field-input" value={fCriador} onChange={(e) => setFCriador(e.target.value)}>
            <option value="">Todos</option>
            {criadores.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="min-w-[140px]">
          <label className="field-label">Status</label>
          <select className="field-input" value={fStatus} onChange={(e) => setFStatus(e.target.value)}>
            <option value="">Todos</option>
            {STATUS_PROPOSTA.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
        {temFiltro && (
          <button className="btn-secondary !py-2 text-sm" onClick={limparFiltros}>Limpar</button>
        )}
      </div>

      <div className="text-sm text-slate-500 dark:text-slate-400">
        {filtradas.length} de {propostas.length} {propostas.length === 1 ? "proposta" : "propostas"}
      </div>

      {/* Tabela */}
      <div className={`overflow-x-auto ${cardCls}`}>
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-900/50 dark:text-slate-400">
            <tr>
              <th className="px-4 py-3">Cliente</th>
              <th className="px-4 py-3">Serviço</th>
              <th className="px-4 py-3">Referência</th>
              <th className="px-4 py-3">Criador</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Atualizada</th>
              <th className="px-4 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtradas.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-400 dark:text-slate-500">
                  {propostas.length === 0 ? "Nenhuma proposta gerada ainda." : "Nenhuma proposta corresponde aos filtros."}
                </td>
              </tr>
            )}
            {filtradas.map((p) => {
              const meta = serviceMap.get(p.serviceKey);
              const podeReabrir = meta?.usesConfigurator;
              return (
                <tr key={p.id} className="border-t border-slate-100 hover:bg-slate-50/60 dark:border-slate-700 dark:hover:bg-slate-700/40">
                  <td className="px-4 py-2 font-medium text-gta-navy dark:text-slate-100">{p.cliente}</td>
                  <td className="px-4 py-2 text-slate-600 dark:text-slate-300">
                    <span className="inline-flex items-center gap-1.5">
                      <ServiceIcon serviceKey={p.serviceKey} className="h-4 w-4 text-gta-indigo dark:text-indigo-300" />
                      {rotuloServico(p.serviceKey)}
                    </span>
                  </td>
                  <td className="px-4 py-2 font-mono text-xs text-slate-500 dark:text-slate-400">{p.referencia || "—"}</td>
                  <td className="px-4 py-2 text-slate-600 dark:text-slate-300">{nomeCriador(p)}</td>
                  <td className="px-4 py-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[p.status] ?? ""}`}>
                      {statusPropostaLabel(p.status)}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-slate-500 dark:text-slate-400">{fmtData(p.atualizadoEm)}</td>
                  <td className="px-4 py-2">
                    <div className="flex justify-end gap-3 text-xs">
                      {podeReabrir && (
                        <Link href={`/nova/${p.serviceKey}?proposta=${p.id}`} className="text-gta-indigo hover:underline">
                          Abrir
                        </Link>
                      )}
                      <button onClick={() => excluir(p)} className="text-red-500 hover:underline dark:text-red-400">
                        Excluir
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

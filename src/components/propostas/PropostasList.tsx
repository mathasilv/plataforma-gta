"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { statusPropostaLabel, type Proposta } from "@/lib/propostas/types";

const STATUS_BADGE: Record<string, string> = {
  rascunho: "bg-slate-100 text-slate-600",
  precificada: "bg-amber-100 text-amber-700",
  gerada: "bg-green-100 text-green-700",
};

function fmtData(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR") + " " + d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

export function PropostasList() {
  const [propostas, setPropostas] = useState<Proposta[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/propostas")
      .then((r) => r.json())
      .then((d) => setPropostas(d.propostas ?? []))
      .catch(() => setErro("Falha ao carregar."))
      .finally(() => setLoading(false));
  }, []);

  async function excluir(p: Proposta) {
    if (!window.confirm(`Excluir a proposta de "${p.cliente}"?`)) return;
    const res = await fetch(`/api/propostas/${p.id}`, { method: "DELETE" });
    if (res.ok) setPropostas((prev) => prev.filter((x) => x.id !== p.id));
    else setErro("Falha ao excluir.");
  }

  const linkAbrir = (p: Proposta) => `/nova/${p.serviceKey}?proposta=${p.id}`;

  if (loading) return <p className="text-sm text-slate-500">Carregando propostas...</p>;

  return (
    <div className="space-y-3">
      {erro && <p className="field-error">{erro}</p>}
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Cliente</th>
              <th className="px-4 py-3">Serviço</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Atualizada</th>
              <th className="px-4 py-3">Ações</th>
            </tr>
          </thead>
          <tbody>
            {propostas.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                  Nenhuma proposta salva ainda.
                </td>
              </tr>
            )}
            {propostas.map((p) => (
              <tr key={p.id} className="border-t border-slate-100">
                <td className="px-4 py-2 font-medium text-gta-navy">{p.cliente}</td>
                <td className="px-4 py-2 uppercase text-slate-500">{p.serviceKey}</td>
                <td className="px-4 py-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[p.status] ?? ""}`}>
                    {statusPropostaLabel(p.status)}
                  </span>
                </td>
                <td className="px-4 py-2 text-slate-500">{fmtData(p.atualizadoEm)}</td>
                <td className="px-4 py-2">
                  <div className="flex gap-3 text-xs">
                    <Link href={linkAbrir(p)} className="text-gta-indigo hover:underline">
                      Abrir
                    </Link>
                    <button onClick={() => excluir(p)} className="text-red-500 hover:underline">
                      Excluir
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

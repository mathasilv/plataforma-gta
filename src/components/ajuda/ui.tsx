import type { ReactNode } from "react";

/** Primitivas visuais compartilhadas pelas páginas de ajuda "Como precificar". */

const card =
  "rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800";

/** Seção com título (e número opcional, para o passo a passo). */
export function AjudaSecao({ n, titulo, children }: { n?: number; titulo: string; children: ReactNode }) {
  return (
    <section className={card}>
      <h2 className="flex items-center gap-2.5 text-lg font-bold text-gta-navy dark:text-slate-100">
        {n != null && (
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gta-indigo text-xs font-bold text-white">{n}</span>
        )}
        {titulo}
      </h2>
      <div className="mt-3 space-y-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{children}</div>
    </section>
  );
}

/** Caixa de fórmula (monoespaçada) com nota opcional. */
export function Formula({ children, nota }: { children: ReactNode; nota?: ReactNode }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900/50">
      <code className="block whitespace-pre-wrap text-[13px] leading-relaxed text-gta-navy dark:text-indigo-200">{children}</code>
      {nota && <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">{nota}</p>}
    </div>
  );
}

/** Destaque inline de um termo/valor. */
export function Destaque({ children }: { children: ReactNode }) {
  return <span className="rounded bg-indigo-50 px-1 font-semibold text-gta-indigo dark:bg-indigo-500/15 dark:text-indigo-300">{children}</span>;
}

/** Tabela simples de duas ou três colunas (ex.: valores padrão). */
export function TabelaAjuda({ colunas, linhas }: { colunas: string[]; linhas: ReactNode[][] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-400 dark:border-slate-700 dark:text-slate-500">
            {colunas.map((c, i) => <th key={i} className={`py-2 pr-4 font-semibold ${i > 0 ? "" : ""}`}>{c}</th>)}
          </tr>
        </thead>
        <tbody>
          {linhas.map((linha, i) => (
            <tr key={i} className="border-b border-slate-100 last:border-0 dark:border-slate-700/60">
              {linha.map((cel, j) => (
                <td key={j} className={`py-2 pr-4 align-top ${j === 0 ? "font-medium text-slate-700 dark:text-slate-200" : "text-slate-600 dark:text-slate-300"}`}>{cel}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

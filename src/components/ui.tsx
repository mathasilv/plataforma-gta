import type { ReactNode } from "react";

/**
 * Primitivos de UI compartilhados da Plataforma GTA. Encapsulam o "acabamento"
 * (espaçamento, tipografia, cores, dark mode) para que as telas fiquem
 * consistentes sem repetir strings de Tailwind. As classes puras de estilo
 * (.card, .section-card, .subcard, .badge, .btn-*, .data-table) ficam em
 * globals.css; aqui estão os componentes com estrutura/lógica.
 */

export type Tone = "slate" | "green" | "amber" | "red" | "indigo";
const BADGE_TONE: Record<Tone, string> = {
  slate: "badge-slate",
  green: "badge-green",
  amber: "badge-amber",
  red: "badge-red",
  indigo: "badge-indigo",
};

/** Pílula de status. */
export function Badge({ tone = "slate", dot, children, className = "" }: { tone?: Tone; dot?: boolean; children: ReactNode; className?: string }) {
  return (
    <span className={`badge ${BADGE_TONE[tone]} ${className}`}>
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" aria-hidden />}
      {children}
    </span>
  );
}

/**
 * Bloco de indicador (rótulo + valor). `destaque` = fundo navy (KPI principal).
 * `tone` pinta o valor (ex.: margem boa/ruim) quando não está em destaque.
 */
export function Kpi({ label, value, destaque, tone, className = "" }: { label: ReactNode; value: ReactNode; destaque?: boolean; tone?: "green" | "amber" | "red"; className?: string }) {
  const toneCls = tone === "green" ? "text-green-600 dark:text-green-400"
    : tone === "amber" ? "text-amber-600 dark:text-amber-400"
    : tone === "red" ? "text-red-600 dark:text-red-400"
    : "text-gta-navy dark:text-slate-100";
  return (
    <div className={`rounded-md p-2.5 shadow-sm ${destaque ? "bg-gta-navy text-white" : "bg-white dark:bg-slate-800"} ${className}`}>
      <div className={`text-xs ${destaque ? "text-slate-300" : "text-slate-500 dark:text-slate-400"}`}>{label}</div>
      <div className={`mt-0.5 font-semibold ${destaque ? "" : toneCls}`}>{value}</div>
    </div>
  );
}

/** Grade de KPIs dentro de uma caixa cinza (o padrão de "resumo" dos cálculos). */
export function KpiGrid({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`grid grid-cols-2 gap-3 rounded-lg bg-slate-50 p-3 sm:grid-cols-4 dark:bg-slate-900/50 ${className}`}>{children}</div>;
}

/** Cabeçalho de página: título + subtítulo + ações à direita. */
export function PageHeader({ title, subtitle, actions }: { title: ReactNode; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h1 className="page-title">{title}</h1>
        {subtitle && <p className="mt-1 subtitle">{subtitle}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}

/** Seção de formulário: cartão + título (+ subtítulo/ações) + conteúdo. */
export function SectionCard({ title, subtitle, actions, children, className = "" }: { title?: ReactNode; subtitle?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string }) {
  const temCabecalho = Boolean(title || actions);
  return (
    <section className={`section-card ${className}`}>
      {temCabecalho && (
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            {title && <h2 className="section-title">{title}</h2>}
            {subtitle && <p className="mt-1 subtitle">{subtitle}</p>}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className={temCabecalho ? "mt-4" : ""}>{children}</div>
    </section>
  );
}

/** Estado vazio padronizado (listas/tabelas sem resultado). */
export function EmptyState({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-400 dark:border-slate-700 dark:text-slate-500 ${className}`}>
      {children}
    </div>
  );
}

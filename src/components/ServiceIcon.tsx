import type { ReactNode } from "react";

/**
 * Ícones SVG (line icons) por serviço — substituem os emojis dos cards.
 * Usam `currentColor`, então herdam a cor do texto e funcionam em claro/escuro.
 * Componente puro (sem hooks): serve em server e client components.
 */

const PANELS: Record<string, ReactNode> = {
  // Sol
  solar: (
    <>
      <circle cx="12" cy="12" r="3.4" />
      <path d="M12 2.6v2.2M12 19.2v2.2M4.6 4.6l1.6 1.6M17.8 17.8l1.6 1.6M2.6 12h2.2M19.2 12h2.2M4.6 19.4l1.6-1.6M17.8 6.2l1.6-1.6" />
    </>
  ),
  // Projeto de Subestação — símbolo de transformador (dois enrolamentos)
  "projeto-subestacao": (
    <>
      <circle cx="9.2" cy="12" r="3.5" />
      <circle cx="14.8" cy="12" r="3.5" />
      <path d="M9.2 4.6v3.9M14.8 4.6v3.9M9.2 15.5v3.9M14.8 15.5v3.9" />
    </>
  ),
  // Execução de Subestação — transformador físico com buchas + raio
  "execucao-subestacao": (
    <>
      <rect x="5" y="8.6" width="14" height="10.8" rx="1.2" />
      <path d="M9 8.6V6.2M15 8.6V6.2" />
      <circle cx="9" cy="5.3" r="1" />
      <circle cx="15" cy="5.3" r="1" />
      <path d="M12.8 11l-2.4 3.4h2.6l-1.8 3" />
    </>
  ),
  // Conexão — plugue/tomada para a rede
  conexao: (
    <>
      <path d="M9 2.6v5M15 2.6v5" />
      <path d="M6.6 7.6h10.8v3.1a5.4 5.4 0 0 1-10.8 0z" />
      <path d="M12 16.1v5.3" />
    </>
  ),
  // Rede MT/BT — torre de transmissão
  "rede-mt": (
    <>
      <path d="M5 21l7-18 7 18" />
      <path d="M12 3v18" />
      <path d="M9.4 8.5h5.2M8 12.6h8M6.6 16.7h10.8" />
    </>
  ),
  // SPDA — escudo com raio
  spda: (
    <>
      <path d="M12 2.5l7 2.8v5.6c0 4.3-3 7.4-7 9-4-1.6-7-4.7-7-9V5.3z" />
      <path d="M12.7 7.1l-2.5 4h2.2l-1.6 3.5" />
    </>
  ),
  // Laudo e Inspeção — prancheta com check
  "laudo-inspecao": (
    <>
      <rect x="5" y="4.6" width="14" height="16.4" rx="2" />
      <path d="M9 4.6V3.7a1.4 1.4 0 0 1 1.4-1.4h3.2A1.4 1.4 0 0 1 15 3.7v.9z" />
      <path d="M8.8 12.6l2.2 2.2 4.2-4.5" />
    </>
  ),
  // Analisador — medidor/ponteiro
  analisador: (
    <>
      <path d="M3.6 17.4a8.4 8.4 0 0 1 16.8 0" />
      <path d="M12 17.4l4.1-3.9" />
      <circle cx="12" cy="17.4" r="1.05" fill="currentColor" stroke="none" />
      <path d="M4.6 17.4h1.4M18 17.4h1.4M12 9.4v-1.3M7.3 11.2l-1-1M16.7 11.2l1-1" />
    </>
  ),
  // Carregador EV — poste com raio e bico
  carregador: (
    <>
      <rect x="5.5" y="3" width="8.4" height="18" rx="1.3" />
      <path d="M10 6.6l-1.8 3.6h2.3l-1.3 3.3 3.2-4.5h-2.3z" />
      <path d="M13.9 8.6h1.9a1.4 1.4 0 0 1 1.4 1.4v4.7a1.6 1.6 0 0 0 3.2 0V11l-1.5-1.5" />
    </>
  ),
  // QGBT — quadro elétrico com disjuntores
  qgbt: (
    <>
      <rect x="5" y="3" width="14" height="18" rx="1.5" />
      <path d="M8.6 7h6.8" />
      <path d="M8.6 11h2.2M13.2 11h2.2M8.6 14h2.2M13.2 14h2.2M8.6 17h2.2M13.2 17h2.2" />
    </>
  ),
  // Projeto Elétrico BT — lápis/projeto
  "projeto-bt": (
    <>
      <path d="M16.7 3.6a2 2 0 0 1 2.8 2.8L8 17.9l-3.6.8.8-3.6z" />
      <path d="M14.4 5.9l2.8 2.8" />
    </>
  ),
  // Limpeza de placas — módulo + brilho
  limpeza: (
    <>
      <rect x="3" y="5" width="12.5" height="9.4" rx="1" />
      <path d="M3 8.1h12.5M7.2 5v9.4M11.3 5v9.4" />
      <path d="M18.4 13.2l.9 2 2 .9-2 .9-.9 2-.9-2-2-.9 2-.9z" fill="currentColor" stroke="none" />
    </>
  ),
};

// Genérico (fallback): raio
const FALLBACK: ReactNode = <path d="M13 2L5 14h6l-1 8 8-12h-6z" />;

export function ServiceIcon({ serviceKey, className = "h-6 w-6" }: { serviceKey: string; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {PANELS[serviceKey] ?? FALLBACK}
    </svg>
  );
}

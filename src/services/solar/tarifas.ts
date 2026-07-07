import tarifasData from "./data/tarifas.json";

/**
 * Tarifas por distribuidora e subgrupo (B1/B2/B3), em R$/kWh.
 * Gerada de `DB_Tarifas` da planilha da GTA (scripts/build-tarifas.mjs).
 *   te   = TE_ENERGIA  (tarifa de energia base)
 *   fioB = TUSD_FioB   (componente Fio B, cobrada sobre a energia injetada)
 */
export type Subgrupo = "B1" | "B2" | "B3";

interface Componentes {
  te?: number;
  fioB?: number;
}

const tarifas = tarifasData as Record<string, Record<string, Componentes>>;

/** Lista de distribuidoras (siglas) em ordem alfabética. */
export function listarDistribuidoras(): string[] {
  return Object.keys(tarifas).sort((a, b) => a.localeCompare(b, "pt-BR"));
}

/** Valor do Fio B (R$/kWh) para a distribuidora/subgrupo. Fallback B1. */
export function getFioB(sigla: string, subgrupo: Subgrupo = "B1"): number {
  const d = tarifas[sigla];
  if (!d) return 0;
  return d[subgrupo]?.fioB ?? d.B1?.fioB ?? 0;
}

/** Tarifa de energia base (R$/kWh) — usada apenas como sugestão ao usuário. */
export function getTarifaEnergiaBase(sigla: string, subgrupo: Subgrupo = "B1"): number {
  const d = tarifas[sigla];
  if (!d) return 0;
  return d[subgrupo]?.te ?? d.B1?.te ?? 0;
}

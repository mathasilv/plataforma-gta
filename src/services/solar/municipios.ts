import municipiosData from "./data/municipios.json";

/**
 * Base município → HSP (irradiação diária média por mês, kWh/m²·dia).
 * Gerada de `DB_MUNICIPIO` + `DB_IRRADIAÇÃO` da planilha (scripts/build-municipios.mjs).
 */
export interface Municipio {
  nome: string; // "GOIANIA - GO"
  uf: string;
  hsp: number[]; // 12 meses (JAN..DEZ)
}

const lista = municipiosData as Municipio[];
const porNome = new Map(lista.map((m) => [m.nome, m]));

/** Lista leve (nome + uf) para o dropdown do cliente. */
export function listarMunicipios(): { nome: string; uf: string }[] {
  return lista.map((m) => ({ nome: m.nome, uf: m.uf }));
}

export function getMunicipio(nome: string): Municipio | undefined {
  return porNome.get(nome);
}

/** HSP média anual (média dos 12 meses) — usada no dimensionamento. */
export function hspMedia(hsp: number[]): number {
  return hsp.reduce((s, h) => s + h, 0) / hsp.length;
}

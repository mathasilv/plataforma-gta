/**
 * Helpers de formatação: moeda, datas, código de referência, número por extenso.
 * Sem dependências de framework — usável no servidor.
 */

import extenso from "extenso";

const MESES_PT = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

/** Converte string/number possivelmente em formato pt-BR ("1.234,56") para number. */
export function parseNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (value == null) return 0;
  const s = String(value).trim();
  if (!s) return 0;
  // Remove separador de milhar "." e troca vírgula decimal por ponto
  const normalized = s
    .replace(/[R$\s]/g, "")
    .replace(/\.(?=\d{3}(\D|$))/g, "")
    .replace(",", ".");
  const n = Number(normalized);
  return Number.isFinite(n) ? n : 0;
}

/** Formata number como moeda pt-BR sem o símbolo (ex.: 18510.74 -> "18.510,74"). */
export function formatMoney(value: number): string {
  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** Formata number como moeda pt-BR com "R$ " (ex.: "R$ 18.510,74"). */
export function formatBRL(value: number): string {
  return "R$ " + formatMoney(value);
}

/** Formata number pt-BR com casas decimais configuráveis (ex.: 7.56 -> "7,56"). */
export function formatDecimal(value: number, decimals = 2): string {
  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * Valor monetário por extenso (ex.: 18510.74 ->
 * "dezoito mil, quinhentos e dez reais e setenta e quatro centavos").
 */
export function moneyToWords(value: number): string {
  try {
    // extenso espera o número em formato pt-BR (vírgula decimal, sem ponto de milhar)
    const ptbr = value.toFixed(2).replace(".", ",");
    const out = extenso(ptbr, { mode: "currency", currency: { type: "BRL" } });
    // Aproxima o estilo dos documentos GTA: vírgula após os grupos de escala
    // (ex.: "dezoito mil quinhentos" -> "dezoito mil, quinhentos").
    return out.replace(/\b(mil|milhão|milhões|bilhão|bilhões) (?!reais\b|e )/g, "$1, ");
  } catch {
    return "";
  }
}

/** Número cardinal por extenso (ex.: 30 -> "trinta"). */
export function numberToWords(n: number): string {
  try {
    return extenso(String(n));
  } catch {
    return "";
  }
}

/** Primeira letra maiúscula. */
export function capitalize(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

/** Data por extenso no padrão "Goiânia, 01 de julho de 2026". */
export function formatDateLong(date: Date, cidade = "Goiânia"): string {
  const dia = String(date.getDate()).padStart(2, "0");
  const mes = MESES_PT[date.getMonth()];
  const ano = date.getFullYear();
  return `${cidade}, ${dia} de ${mes} de ${ano}`;
}

/** Data curta "21 de julho de 2026". */
export function formatDateShort(date: Date): string {
  const dia = String(date.getDate()).padStart(2, "0");
  const mes = MESES_PT[date.getMonth()];
  const ano = date.getFullYear();
  return `${dia} de ${mes} de ${ano}`;
}

/** Soma dias corridos a uma data. */
export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

/**
 * Gera o "slug" do cliente para o código de referência: sem acentos, maiúsculas,
 * apenas letras/números, junto (ex.: "Maria Selma" -> "MARIASELMA").
 */
export function clientSlug(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

/**
 * Monta o código de referência GTA-<ano>-<CLIENTE>-<PREFIXO>-<NNN>.
 * Ex.: GTA-2026-MARIASELMA-SOLAR-003
 */
export function buildReference(
  prefix: string,
  clientName: string,
  seq: number,
  year: number,
): string {
  const nnn = String(seq).padStart(3, "0");
  return `GTA-${year}-${clientSlug(clientName)}-${prefix}-${nnn}`;
}

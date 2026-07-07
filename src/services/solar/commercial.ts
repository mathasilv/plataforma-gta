/**
 * Valores COMERCIAIS de mercado para o dimensionamento — potências que de fato
 * existem para comprar. Módulo leve e sem dependências: é importado também no
 * cliente (o configurador), então não pode puxar a base de municípios.
 */

/** Potências comerciais de módulos fotovoltaicos (Wp). */
export const PAINEIS_COMERCIAIS = [450, 550, 570, 585, 610, 660, 700];

/** Potências comerciais de inversores string (kW). */
export const INVERSORES_COMERCIAIS = [3, 3.5, 4, 5, 6, 7, 7.5, 8, 9, 10, 12, 15, 20, 25, 30, 36, 40, 50, 60, 75];

/**
 * Sugere o inversor comercial mais próximo do alvo kWpTotal/(1+overload
 * desejado). O usuário pode trocar — é um ponto de partida, não uma trava.
 */
export function sugerirInversorComercial(kwpTotal: number, overloadDesejado: number): number {
  const alvo = kwpTotal / (1 + overloadDesejado);
  let melhor = INVERSORES_COMERCIAIS[0];
  for (const p of INVERSORES_COMERCIAIS) {
    if (Math.abs(p - alvo) < Math.abs(melhor - alvo)) melhor = p;
  }
  return melhor;
}

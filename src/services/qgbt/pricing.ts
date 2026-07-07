/**
 * Precificação de QGBT (Quadro Geral de Baixa Tensão) — modelo real da GTA
 * (planilha GEOLAB): é um produto manufaturado (quadro + barramentos + disjuntores
 * + montagem), precificado por custo × Fator K.
 *   custoTotal   = custo unitário × nº de quadros   (materiais + montagem)
 *   faturamento  = custoTotal × Fator K             (Fator K ~1,55)
 *   impostos/NF  = faturamento × alíquota           (~15%)
 *   margem líq.  = (faturamento − custo − impostos) / faturamento ≈ 20%
 */

export interface QgbtInput {
  custoUnitario: number;
  qtdQuadros: number;
}

export interface QgbtParams {
  fatorK: number;
  aliqImpostos: number;
}

export interface QgbtResult {
  custoUnitario: number;
  qtdQuadros: number;
  custo: number;
  fatorK: number;
  faturamento: number;
  impostos: number;
  lucro: number;
  margem: number;
}

export function precoQgbt(i: QgbtInput, p: QgbtParams): QgbtResult {
  const custoUnitario = Math.max(0, i.custoUnitario || 0);
  const qtd = Math.max(1, Math.floor(i.qtdQuadros || 1));
  const custo = custoUnitario * qtd;

  const k = Math.min(4, Math.max(1, p.fatorK));
  const faturamento = Math.round((custo * k) / 10) * 10;
  const aliq = Math.min(0.5, Math.max(0, p.aliqImpostos));
  const impostos = faturamento * aliq;
  const lucro = faturamento - custo - impostos;
  const margem = faturamento > 0 ? lucro / faturamento : 0;

  return { custoUnitario, qtdQuadros: qtd, custo, fatorK: k, faturamento, impostos, lucro, margem };
}

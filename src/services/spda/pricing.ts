/**
 * Precificação de PROJETO de SPDA (ABNT NBR 5419) — modelo real da GTA,
 * extraído da planilha de custo do CESSG (06/2026):
 *   gerenciamento de risco = valor por bloco × nº de blocos   (POR BLOCO)
 *   projeto de SPDA        = preço por m² × área total         (POR M²)
 *   design (proposta)      = max(risco + projeto, piso mínimo) (piso p/ jobs pequenos)
 * O preço é dirigido pelas métricas (m²/bloco); o custo/imposto entram só como
 * conferência da margem. A execução (mão de obra + materiais) é orçada à parte.
 */

export interface SpdaPricingInput {
  /** Nº de blocos/estruturas (cada um tem sua própria análise de risco) */
  nBlocos: number;
  /** Área total de cobertura (m²) para o dimensionamento do projeto */
  areaM2: number;
  /** Custo logístico/operacional estimado (deslocamento, hospedagem, diárias,
   *  aluguel de terrômetro, estagiário) — só para conferir a margem. */
  custoLogistico: number;
}

export interface SpdaPricingParams {
  /** R$ por bloco (gerenciamento de risco) */
  valorPorBloco: number;
  /** R$ por m² (projeto de SPDA) */
  precoPorM2: number;
  /** Piso mínimo do design (risco + projeto), protege jobs pequenos */
  pisoMinimo: number;
  /** Alíquota de impostos/NF sobre o faturamento (fração: 0,15 = 15%) */
  aliqImpostos: number;
}

export interface SpdaPricingResult {
  risco: number; // por bloco
  projetoCalc: number; // preço/m² × área (antes do piso)
  projeto: number; // valor do item projeto (absorve o piso, quando aplicado)
  aplicouPiso: boolean;
  design: number; // risco + projeto = faturamento do projeto
  impostos: number;
  custoLogistico: number;
  lucro: number;
  margem: number; // lucro / design
}

export function precoSpda(i: SpdaPricingInput, p: SpdaPricingParams): SpdaPricingResult {
  const nBlocos = Math.max(0, Math.floor(i.nBlocos || 0));
  const areaM2 = Math.max(0, i.areaM2 || 0);

  const risco = Math.max(0, p.valorPorBloco) * nBlocos;
  const projetoCalc = Math.max(0, p.precoPorM2) * areaM2;
  const designCalc = risco + projetoCalc;

  const piso = Math.max(0, p.pisoMinimo);
  const aplicouPiso = designCalc < piso;
  const design = aplicouPiso ? piso : designCalc;
  // Quando o piso é aplicado, o item "projeto" absorve a diferença (parte variável).
  const projeto = design - risco;

  const aliq = Math.min(0.5, Math.max(0, p.aliqImpostos));
  const impostos = design * aliq;
  const custoLogistico = Math.max(0, i.custoLogistico || 0);
  const lucro = design - impostos - custoLogistico;
  const margem = design > 0 ? lucro / design : 0;

  return { risco, projetoCalc, projeto, aplicouPiso, design, impostos, custoLogistico, lucro, margem };
}

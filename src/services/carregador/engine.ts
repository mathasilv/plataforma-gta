/**
 * Carregador veicular (EV) — dimensionamento (NBR 5410) + lista de materiais
 * paramétrica + precificação por custo. Codifica a planilha real da GTA
 * (Eduardo): In = P/V, Ib = In×1,25, disjuntor comercial, seção por ampacidade
 * e queda de tensão; materiais escalam com distância/nº de pontos; preço =
 * (materiais×fatorK + mão de obra) / (1 − margem).
 */

export type Fase = "mono" | "tri";

const DISJUNTORES = [16, 20, 25, 32, 40, 50, 63, 80, 100, 125, 160];
/** Ampacidade (A) por seção (mm²) — cobre EPR/HEPR, método B1 (aprox. NBR 5410). */
const AMPACIDADE: { s: number; i: number }[] = [
  { s: 2.5, i: 24 }, { s: 4, i: 32 }, { s: 6, i: 41 }, { s: 10, i: 57 },
  { s: 16, i: 76 }, { s: 25, i: 101 }, { s: 35, i: 125 }, { s: 50, i: 151 }, { s: 70, i: 192 },
];
const CONDUTIVIDADE_CU = 56;
const menorMaiorIgual = (arr: number[], v: number) => arr.find((x) => x >= v) ?? arr[arr.length - 1];

export interface SizingEVInput {
  potenciaKw: number;
  fase: Fase;
  distanciaM: number;
}
export interface SizingEV {
  tensao: number;
  correnteNominal: number; // In (A)
  correnteProjeto: number; // Ib = In×1,25 (A)
  disjuntorA: number;
  polos: number; // 2 (mono) | 4 (tri)
  secaoMm2: number;
  quedaPct: number;
  nCondutores: number; // 3 (mono: F+N+T) | 5 (tri: 3F+N+T)
}

export function dimensionarEV(i: SizingEVInput): SizingEV {
  const fase = i.fase;
  const tensao = fase === "mono" ? 220 : 380;
  const raiz = fase === "mono" ? 1 : Math.sqrt(3);
  const P = Math.max(0, i.potenciaKw) * 1000;
  const In = P / (raiz * tensao);
  const Ib = In * 1.25;
  const L = Math.max(1, i.distanciaM);

  // menor seção com ampacidade ≥ Ib e queda de tensão ≤ 4%
  let escolha = AMPACIDADE[AMPACIDADE.length - 1];
  for (const a of AMPACIDADE) {
    if (a.i < Ib) continue;
    const queda = (2 * In * L) / (CONDUTIVIDADE_CU * a.s * tensao); // fração
    if (queda <= 0.04) { escolha = a; break; }
    escolha = a; // guarda a maior tentada
  }
  const quedaPct = (2 * In * L) / (CONDUTIVIDADE_CU * escolha.s * tensao);

  return {
    tensao,
    correnteNominal: In,
    correnteProjeto: Ib,
    disjuntorA: menorMaiorIgual(DISJUNTORES, In), // padrão GTA: comercial ≥ In nominal
    polos: fase === "mono" ? 2 : 4,
    secaoMm2: escolha.s,
    quedaPct,
    nCondutores: fase === "mono" ? 3 : 5,
  };
}

// ----------------------------------------------------- Lista de materiais (BOM)

/** Preços unitários de referência (R$) — planilha GTA; ajustáveis nos parâmetros. */
export const PRECOS_BASE = {
  eletrodutoBarra: 45, luva: 5, curva: 15, abracadeira: 2.5, buchaArruela: 3,
  quadro: 80, dps: 60, haste: 65, caixaInspecao: 25, conectorAterr: 10,
  terminal: 0.5, fitaIsolante: 15, fitaAutofusao: 25,
};
const CABO_PRECO: Record<number, number> = { 2.5: 5, 4: 6.5, 6: 8, 10: 12, 16: 18, 25: 28, 35: 38, 50: 55, 70: 78 };
const DISJ_PRECO: Record<number, number> = { 16: 45, 20: 48, 25: 52, 32: 56, 40: 60, 50: 70, 63: 90, 80: 120, 100: 150, 125: 190, 160: 240 };
const DR_PRECO: Record<number, number> = { 40: 350, 63: 420, 80: 520, 100: 620, 125: 750, 160: 900 };
const precoDe = (tabela: Record<number, number>, k: number) => tabela[k] ?? tabela[menorMaiorIgual(Object.keys(tabela).map(Number).sort((a, b) => a - b), k)] ?? 0;

export interface BomItemEV {
  categoria: string;
  descricao: string;
  unidade: string;
  qtd: number;
  precoUnit: number;
  precoTotal: number;
}

export function gerarBomEV(s: SizingEV, distanciaM: number, qtd: number, fatorK = 1): { itens: BomItemEV[]; custoMateriais: number } {
  const L = Math.max(1, distanciaM);
  const n = Math.max(1, qtd);
  const barras = Math.ceil(L / 3);
  const item = (categoria: string, descricao: string, unidade: string, qtdLiquida: number, precoUnit: number): BomItemEV => {
    const q = Math.ceil(qtdLiquida * fatorK);
    return { categoria, descricao, unidade, qtd: q, precoUnit, precoTotal: q * precoUnit };
  };

  const itens: BomItemEV[] = [
    item("Infraestrutura", 'Eletroduto galvanizado pesado 1" (barra 3 m)', "barra", barras, PRECOS_BASE.eletrodutoBarra),
    item("Infraestrutura", 'Luva galvanizada 1"', "un", barras, PRECOS_BASE.luva),
    item("Infraestrutura", 'Curva galvanizada 1" 90º', "un", 4 * n, PRECOS_BASE.curva),
    item("Infraestrutura", 'Abraçadeira tipo D / Unistrut 1"', "un", Math.ceil(L * 0.75), PRECOS_BASE.abracadeira),
    item("Infraestrutura", 'Bucha e arruela de alumínio 1"', "par", 4 * n, PRECOS_BASE.buchaArruela),
    item("Cabeamento", `Cabo flexível HEPR ${s.secaoMm2} mm² (F/N/T)`, "m", L * s.nCondutores, precoDe(CABO_PRECO, s.secaoMm2)),
    item("Proteção", "Quadro de distribuição IP65 (sobrepor)", "un", n, PRECOS_BASE.quadro),
    item("Proteção", `Disjuntor termomagnético ${s.disjuntorA} A curva C (${s.polos}P)`, "un", n, precoDe(DISJ_PRECO, s.disjuntorA)),
    item("Proteção", `Interruptor DR ${s.disjuntorA} A / 30 mA Tipo A (${s.polos}P)`, "un", n, precoDe(DR_PRECO, s.disjuntorA)),
    item("Proteção", "Protetor de surto (DPS) Classe II 275 V / 40 kA", "un", 2 * n, PRECOS_BASE.dps),
    item("Aterramento", 'Haste de aterramento cobreada 5/8" x 2,40 m', "un", n, PRECOS_BASE.haste),
    item("Aterramento", "Caixa de inspeção de solo", "un", n, PRECOS_BASE.caixaInspecao),
    item("Aterramento", "Conector tipo cunha / grampo", "un", n, PRECOS_BASE.conectorAterr),
    item("Acessórios", `Terminal tubular (ilhós) ${s.secaoMm2} mm²`, "un", s.nCondutores * 2 * n, PRECOS_BASE.terminal),
    item("Acessórios", "Fita isolante alta qualidade (rolo 20 m)", "un", n, PRECOS_BASE.fitaIsolante),
    item("Acessórios", "Fita de autofusão (emendas externas)", "un", n, PRECOS_BASE.fitaAutofusao),
  ];
  const custoMateriais = itens.reduce((sum, it) => sum + it.precoTotal, 0);
  return { itens, custoMateriais };
}

// ----------------------------------------------------- Precificação

export interface PrecoEVParams {
  maoObraPorPonto: number;
  margem: number; // fração
  fatorK: number;
}
export interface PrecoEVResult {
  custoMateriais: number;
  maoObra: number;
  custoGeral: number;
  preco: number;
  margem: number;
  lucro: number;
}

export function precoEV(custoMateriais: number, qtd: number, p: PrecoEVParams): PrecoEVResult {
  const maoObra = p.maoObraPorPonto * Math.max(1, qtd);
  const custoGeral = custoMateriais + maoObra;
  const m = Math.min(0.95, Math.max(0, p.margem));
  const bruto = custoGeral / (1 - m);
  const preco = Math.round(bruto / 10) * 10;
  return { custoMateriais, maoObra, custoGeral, preco, margem: m, lucro: preco - custoGeral };
}

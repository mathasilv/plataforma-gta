/**
 * Dimensionamento de subestação (projeto) — engenharia elétrica padrão ABNT.
 *
 * A partir da carga/demanda e das tensões, seleciona o transformador comercial,
 * calcula as correntes de primário/secundário e sugere proteção (elo fusível +
 * disjuntor geral) e condutor de MT. Serve de base para o projeto; o engenheiro
 * revisa. Precificação por faixa de kVA, derivada do histórico de propostas GTA.
 */

/** Potências nominais comerciais de transformadores de distribuição (kVA). */
export const TRAFOS_KVA = [15, 30, 45, 75, 112.5, 150, 225, 300, 500, 750, 1000, 1250, 1500, 2000, 2500, 3000];

/** Disjuntores gerais de BT padronizados (A). */
export const DISJUNTORES_A = [100, 125, 160, 200, 250, 320, 400, 500, 630, 800, 1000, 1250, 1600, 2000, 2500];

/** Elos fusíveis de distribuição (corrente nominal em A + tipo). */
export const ELOS_FUSIVEL = [
  { a: 1, t: "H" }, { a: 2, t: "H" }, { a: 3, t: "H" }, { a: 5, t: "H" },
  { a: 6, t: "K" }, { a: 8, t: "K" }, { a: 10, t: "K" }, { a: 12, t: "K" },
  { a: 15, t: "K" }, { a: 20, t: "K" }, { a: 25, t: "K" }, { a: 30, t: "K" },
  { a: 40, t: "K" }, { a: 50, t: "K" }, { a: 65, t: "K" }, { a: 80, t: "K" }, { a: 100, t: "K" },
];

const menorMaiorIgual = (arr: number[], v: number) => arr.find((x) => x >= v) ?? arr[arr.length - 1];

export type TipoSE = "Aérea" | "Abrigada" | "Pedestal";
export type ModoDemanda = "carga" | "demanda";

export interface SizingSEInput {
  modo: ModoDemanda;
  cargaKw?: number; // quando modo = "carga"
  fatorDemanda?: number; // 0..1 (ex.: 0,6)
  fatorPotencia?: number; // ex.: 0,92
  demandaKva?: number; // quando modo = "demanda"
  tensaoMt: number; // kV (13.8 | 34.5)
  tensaoBt: number; // V (380 | 220 | 440)
}

export interface SizingSEResult {
  demandaKva: number;
  trafoKva: number;
  aproveitamento: number; // demanda / trafo (0..1)
  correntePrimaria: number; // A
  correnteSecundaria: number; // A
  elo: string; // ex.: "10K"
  disjuntorBt: number; // A
  condutorMt: string;
}

const RAIZ3 = Math.sqrt(3);

export function dimensionarSE(i: SizingSEInput): SizingSEResult {
  const fp = i.fatorPotencia && i.fatorPotencia > 0 ? i.fatorPotencia : 0.92;
  const demanda =
    i.modo === "demanda"
      ? Math.max(0, i.demandaKva ?? 0)
      : (Math.max(0, i.cargaKw ?? 0) * (i.fatorDemanda ?? 1)) / fp;

  const trafo = menorMaiorIgual(TRAFOS_KVA, demanda);
  const S = trafo * 1000; // VA
  const vMt = i.tensaoMt * 1000; // V
  const vBt = i.tensaoBt; // V

  const correntePrimaria = S / (RAIZ3 * vMt);
  const correnteSecundaria = S / (RAIZ3 * vBt);

  // Elo fusível protege o transformador: ~1,5 × corrente nominal do primário
  const alvoElo = 1.5 * correntePrimaria;
  const e = ELOS_FUSIVEL.find((x) => x.a >= alvoElo) ?? ELOS_FUSIVEL[ELOS_FUSIVEL.length - 1];

  const disjuntorBt = menorMaiorIgual(DISJUNTORES_A, correnteSecundaria);

  const secao =
    correntePrimaria <= 110 ? "25 mm²" : correntePrimaria <= 145 ? "35 mm²" : correntePrimaria <= 180 ? "50 mm²" : "70 mm²";
  const classe = i.tensaoMt <= 15 ? "15/25 kV" : "25/35 kV";

  return {
    demandaKva: demanda,
    trafoKva: trafo,
    aproveitamento: trafo > 0 ? demanda / trafo : 0,
    correntePrimaria,
    correnteSecundaria,
    elo: `${e.a}${e.t}`,
    disjuntorBt,
    condutorMt: `${secao} XLPE ${classe}`,
  };
}

/**
 * Preço do PROJETO por custo (bottom-up):
 *   horas = base(tipo) + horasPorCemKva × (kVA/100)
 *   custo = horas × valor/hora + ART
 *   preço = custo × (1 + margem), arredondado a R$ 50
 */
export interface PrecoParams {
  valorHora: number;
  horasAerea: number;
  horasAbrigada: number;
  horasPedestal: number;
  horasPorCemKva: number;
  artProjeto: number;
  margemProjeto: number;
}

export interface PrecoResult {
  horas: number;
  custo: number;
  margem: number;
  precoUnitario: number;
  precoTotal: number;
}

export function precoProjeto(p: PrecoParams, tipo: TipoSE, trafoKva: number, qtd = 1): PrecoResult {
  const horasBase = tipo === "Abrigada" ? p.horasAbrigada : tipo === "Pedestal" ? p.horasPedestal : p.horasAerea;
  const horas = horasBase + p.horasPorCemKva * (trafoKva / 100);
  const custo = horas * p.valorHora + p.artProjeto;
  const precoUnitario = Math.round((custo * (1 + p.margemProjeto)) / 50) * 50;
  return {
    horas,
    custo,
    margem: p.margemProjeto,
    precoUnitario,
    precoTotal: precoUnitario * Math.max(1, qtd),
  };
}

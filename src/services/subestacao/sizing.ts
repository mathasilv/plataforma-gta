/**
 * Dimensionamento de subestação — segue a metodologia oficial da Equatorial
 * (NT.00002.EQTL, "Anexo II — Dimensionamento de SE Aérea"), extraída da
 * planilha usada nos projetos reais da GTA.
 *
 * Seleção do transformador por FAIXA de demanda (Tabela C da NT), não por
 * "menor padrão ≥ demanda" — a NT admite leve sobrecarga. SE aérea vai até
 * 300 kVA (demanda ≤ 330 kVA); acima disso é abrigada. Também define o poste
 * (Tabela D) e o banco de capacitores mínimo (Tabela F).
 */

export type TipoSE = "Aérea" | "Abrigada" | "Pedestal";
export type ModoDemanda = "carga" | "demanda";
export type Atendimento = "BT" | "Aérea" | "Abrigada";

/** Tabela C (NT.002) — SE Aérea: faixa de demanda (kVA) → transformador (kVA). */
const AEREA_TABELA: { max: number; kva: number }[] = [
  { max: 82.9, kva: 75 },
  { max: 124.9, kva: 112.5 },
  { max: 165.9, kva: 150 },
  { max: 248.9, kva: 225 },
  { max: 330, kva: 300 },
];

/** Transformadores padrão para SE abrigada (demanda > 330 kVA). */
const TRAFOS_ABRIGADA = [300, 500, 750, 1000, 1250, 1500, 2000, 2500, 3000];

/** Tabela D (NT.002) — poste duplo T por transformador. */
const POSTE: Record<number, { daN: number; m: number }> = {
  75: { daN: 300, m: 11 }, 112.5: { daN: 600, m: 11 }, 150: { daN: 600, m: 11 },
  225: { daN: 800, m: 11 }, 300: { daN: 1000, m: 11 },
};

/** Tabela F (NT.002) — banco de capacitores fixo mínimo (kVAr) por transformador. */
const CAPACITOR: Record<number, number> = {
  75: 4, 112.5: 5, 150: 6, 225: 7.5, 300: 8, 500: 12.5, 750: 17, 1000: 19, 1250: 22, 1500: 25, 2000: 30,
};

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
const capacitorDe = (kva: number) => {
  const chaves = Object.keys(CAPACITOR).map(Number).sort((a, b) => a - b);
  return CAPACITOR[menorMaiorIgual(chaves, kva)] ?? 0;
};

export interface SizingSEInput {
  modo: ModoDemanda;
  cargaKw?: number;
  fatorDemanda?: number;
  fatorPotencia?: number;
  demandaKva?: number;
  tensaoMt: number; // kV
  tensaoBt: number; // V
  tipoSE?: TipoSE;
}

export interface SizingSEResult {
  demandaKva: number;
  atendimento: Atendimento;
  aviso: string;
  trafoKva: number;
  aproveitamento: number;
  correntePrimaria: number;
  correnteSecundaria: number;
  elo: string;
  disjuntorBt: number;
  condutorMt: string;
  poste: string; // "800 daN / 11 m" (só aérea)
  bancoCapacitor: number; // kVAr
}

const RAIZ3 = Math.sqrt(3);

export function dimensionarSE(i: SizingSEInput): SizingSEResult {
  const fp = i.fatorPotencia && i.fatorPotencia > 0 ? i.fatorPotencia : 0.92;
  const demanda =
    i.modo === "demanda"
      ? Math.max(0, i.demandaKva ?? 0)
      : (Math.max(0, i.cargaKw ?? 0) * (i.fatorDemanda ?? 1)) / fp;

  const tipo = i.tipoSE ?? "Aérea";
  const vazio: SizingSEResult = {
    demandaKva: demanda, atendimento: "BT", aviso: "", trafoKva: 0, aproveitamento: 0,
    correntePrimaria: 0, correnteSecundaria: 0, elo: "—", disjuntorBt: 0, condutorMt: "—", poste: "—", bancoCapacitor: 0,
  };

  if (demanda > 0 && demanda < 60) {
    return { ...vazio, aviso: "Demanda abaixo de 60 kVA: atendimento em baixa tensão (sem subestação)." };
  }

  let trafoKva = 0;
  let atendimento: Atendimento = "Aérea";
  let aviso = "";

  if (tipo === "Aérea") {
    if (demanda > 330) {
      atendimento = "Abrigada";
      trafoKva = menorMaiorIgual(TRAFOS_ABRIGADA, demanda);
      aviso = "Demanda acima de 330 kVA: pela NT.002 exige subestação abrigada. Altere o tipo para Abrigada.";
    } else {
      const faixa = AEREA_TABELA.find((r) => demanda <= r.max);
      trafoKva = faixa ? faixa.kva : 300;
      atendimento = "Aérea";
    }
  } else {
    atendimento = "Abrigada";
    trafoKva = menorMaiorIgual(TRAFOS_ABRIGADA, demanda);
  }

  if (trafoKva === 0) return vazio;

  const S = trafoKva * 1000;
  const vMt = i.tensaoMt * 1000;
  const correntePrimaria = S / (RAIZ3 * vMt);
  const correnteSecundaria = S / (RAIZ3 * i.tensaoBt);

  const e = ELOS_FUSIVEL.find((x) => x.a >= 1.5 * correntePrimaria) ?? ELOS_FUSIVEL[ELOS_FUSIVEL.length - 1];
  const disjuntorBt = menorMaiorIgual(DISJUNTORES_A, correnteSecundaria);

  const secao =
    correntePrimaria <= 110 ? "25 mm²" : correntePrimaria <= 145 ? "35 mm²" : correntePrimaria <= 180 ? "50 mm²" : "70 mm²";
  const classe = i.tensaoMt <= 15 ? "15/25 kV" : "25/35 kV";

  const p = atendimento === "Aérea" ? POSTE[trafoKva] : undefined;

  return {
    demandaKva: demanda,
    atendimento,
    aviso,
    trafoKva,
    aproveitamento: trafoKva > 0 ? demanda / trafoKva : 0,
    correntePrimaria,
    correnteSecundaria,
    elo: `${e.a}${e.t}`,
    disjuntorBt,
    condutorMt: `${secao} XLPE ${classe}`,
    poste: p ? `${p.daN} daN / ${p.m} m` : "—",
    bancoCapacitor: capacitorDe(trafoKva),
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

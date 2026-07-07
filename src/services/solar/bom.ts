import { formatDecimal } from "@/lib/format";

/**
 * Lista de materiais GENÉRICA (sem marca/modelo) — serve para a GTA cotar o kit
 * com o distribuidor. Quantidades derivadas do nº de painéis / kWp.
 */

export type TipoInversor = "string" | "micro";

export interface BomInput {
  nPaineis: number;
  potenciaPainel: number; // W
  tipoInversor: TipoInversor;
  potenciaInversor: number; // kW
  qtdInversores: number;
  tipoTelhado: string; // ex.: "Metálico", "Colonial", "Fibrocimento", "Laje"
}

export interface BomItem {
  qtde: string;
  descricao: string;
}

export function gerarBom(i: BomInput): BomItem[] {
  const invLabel = i.tipoInversor === "micro" ? "MICROINVERSOR" : "INVERSOR";
  const paresConectores = Math.max(2, Math.ceil(i.nPaineis / 2)); // estimativa genérica
  const metrosCabo = Math.max(50, i.nPaineis * 4); // estimativa genérica (ajustável na cotação)

  return [
    { qtde: String(i.nPaineis), descricao: `MÓDULO FOTOVOLTAICO ${i.potenciaPainel} Wp` },
    {
      qtde: String(i.qtdInversores),
      descricao: `${invLabel} ${formatDecimal(i.potenciaInversor, 2)} kW`,
    },
    {
      qtde: "1",
      descricao: `ESTRUTURA DE FIXAÇÃO PARA TELHADO ${i.tipoTelhado.toUpperCase()} — KIT PARA ${i.nPaineis} MÓDULOS`,
    },
    { qtde: `${metrosCabo} m`, descricao: "CABO SOLAR 6 MM² 1,8 kV CC — PRETO" },
    { qtde: `${metrosCabo} m`, descricao: "CABO SOLAR 6 MM² 1,8 kV CC — VERMELHO" },
    { qtde: `${paresConectores}`, descricao: "PAR DE CONECTORES FOTOVOLTAICOS MC4 (MACHO/FÊMEA)" },
    { qtde: "1", descricao: "PROTEÇÃO CC — STRING BOX / DPS CC (conforme projeto)" },
    { qtde: "1", descricao: "PROTEÇÃO CA — DISJUNTOR + DPS CA (conforme projeto)" },
  ];
}

/** Texto simples da lista (para copiar e enviar ao distribuidor). */
export function bomParaTexto(itens: BomItem[]): string {
  return itens.map((it) => `${it.qtde}\t${it.descricao}`).join("\n");
}

/**
 * Presets do serviço Solar: textos que variam conforme o distribuidor do kit
 * e conforme o tipo de inversor. Centralizados aqui para fácil manutenção.
 */

export interface DistribuidorPreset {
  value: string;
  label: string;
  /** Nome completo na linha de faturamento (item 6.1) */
  nome: string;
  /** Nome curto usado nas Condições Gerais */
  nomeCurto: string;
  /** CNPJ do distribuidor */
  cnpj: string;
  /** Texto padrão de garantia técnica (Seção 8) */
  garantia: string;
}

export const DISTRIBUIDORES: DistribuidorPreset[] = [
  {
    value: "weg",
    label: "WEG",
    nome: "WEG Equipamentos Elétricos S.A",
    nomeCurto: "WEG",
    cnpj: "07.175.725/0001-60",
    garantia:
      "A fabricante WEG concede garantia de 1 (um) ano contra defeitos de fabricação para seus sistemas inversores, e a fabricante LONGi concede garantia de fábrica para os módulos fotovoltaicos. Eventuais garantias adicionais oferecidas por fabricantes de componentes avulsos que compõem nossos geradores (painéis, cabos, inversores, conectores, baterias, estruturas de fixação etc.) são de responsabilidade exclusiva desses fabricantes.",
  },
  {
    value: "belenergy",
    label: "BelEnergy",
    nome: "BelEnergy",
    nomeCurto: "BelEnergy",
    cnpj: "05.151.518/0001-40",
    garantia:
      "A Fornecedora (BelEnergy) concede garantia de 1 (um) ano contra defeitos de fabricação para o kit fotovoltaico fornecido. Eventuais garantias adicionais oferecidas pelos fabricantes dos componentes que compõem o sistema (módulos, inversor, cabos, conectores, estruturas de fixação etc.) são de responsabilidade exclusiva desses fabricantes.",
  },
  {
    value: "outro",
    label: "Outro distribuidor",
    nome: "",
    nomeCurto: "",
    cnpj: "",
    garantia:
      "A Fornecedora concede garantia de 1 (um) ano contra defeitos de fabricação para o kit fotovoltaico fornecido. Eventuais garantias adicionais oferecidas pelos fabricantes dos componentes que compõem o sistema (módulos, inversor, cabos, conectores, estruturas de fixação etc.) são de responsabilidade exclusiva desses fabricantes.",
  },
];

export function getDistribuidor(value: string): DistribuidorPreset {
  return DISTRIBUIDORES.find((d) => d.value === value) ?? DISTRIBUIDORES[DISTRIBUIDORES.length - 1];
}

/** Meses na ordem, com valores de insolação de referência (Goiânia) como padrão. */
export const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

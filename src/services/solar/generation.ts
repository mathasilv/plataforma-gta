/**
 * Simulação de geração dos 12 meses — codifica a aba "Previsão de Geração".
 *   geração_mês(kWh) = HSP_mês × kWpTotal × eficiência × dias_no_mês
 */

const MESES_PT = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];
// Dias por mês (a planilha usa 28 para fevereiro, sem ano bissexto)
const DIAS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

export interface GeracaoLinha {
  mes: string;
  insolacao: number; // HSP do mês (kWh/m²·dia)
  energia: number; // kWh gerados no mês
  consumo: number; // kWh consumidos no mês
}

export interface GeracaoResultado {
  linhas: GeracaoLinha[];
  totalEnergia: number;
  totalConsumo: number;
}

export function simularGeracao(
  hsp: number[],
  kwpTotal: number,
  eficiencia: number,
  consumo: number[],
): GeracaoResultado {
  const linhas: GeracaoLinha[] = MESES_PT.map((mes, m) => {
    const energia = hsp[m] * kwpTotal * eficiencia * DIAS[m];
    return {
      mes,
      insolacao: hsp[m],
      energia,
      consumo: Number(consumo[m] ?? 0),
    };
  });
  return {
    linhas,
    totalEnergia: linhas.reduce((s, l) => s + l.energia, 0),
    totalConsumo: linhas.reduce((s, l) => s + l.consumo, 0),
  };
}

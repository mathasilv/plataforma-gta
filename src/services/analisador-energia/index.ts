import { criarServicoConfigurador } from "../_cpq/configurador";

/**
 * Locação de Analisador de Energia. REGRA FIXA (gestão): R$ 1.500,00 por semana.
 * O AnalisadorConfigurator (ServicoSimplesConfigurator) calcula o valor.
 */
export const analisadorEnergiaService = criarServicoConfigurador({
  key: "analisador",
  label: "Analisador de Energia",
  description: "Locação com instalação, medição e relatório — R$ 1.500 por semana.",
  referencePrefix: "ANALISADOR",
});

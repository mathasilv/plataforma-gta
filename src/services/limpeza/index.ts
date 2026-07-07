import { criarServicoConfigurador } from "../_cpq/configurador";

/**
 * Limpeza de Placas Solares — preço por placa, com piso mínimo. O
 * LimpezaConfigurator (ServicoSimplesConfigurator) calcula o valor.
 */
export const limpezaPlacasService = criarServicoConfigurador({
  key: "limpeza",
  label: "Limpeza de Placas Solares",
  description: "Limpeza de módulos fotovoltaicos com inspeção e relatório, por nº de placas.",
  referencePrefix: "LIMPEZA",
});

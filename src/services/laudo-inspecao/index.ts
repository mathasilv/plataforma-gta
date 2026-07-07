import { criarServicoConfigurador } from "../_cpq/configurador";

/**
 * Laudo e Inspeção Técnica — preço por unidade (torre/edificação). O
 * LaudoConfigurator (ServicoSimplesConfigurator) calcula o valor.
 */
export const laudoInspecaoService = criarServicoConfigurador({
  key: "laudo-inspecao",
  label: "Laudo e Inspeção Técnica",
  description: "Vistoria, laudo e ART (instalações, SPDA, iluminação de emergência) por edificação/torre.",
  referencePrefix: "LAUDO",
});

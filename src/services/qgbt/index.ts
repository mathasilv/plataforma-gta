import { criarServicoConfigurador } from "../_cpq/configurador";

/**
 * Fornecimento de QGBT — configurador próprio: precifica por custo × Fator K
 * (produto manufaturado — ver ./pricing.ts). O QgbtConfigurator monta os itens
 * já precificados e envia o formData; o .docx reusa o molde padrão.
 */
export const qgbtService = criarServicoConfigurador({
  key: "qgbt",
  label: "Fornecimento de QGBT",
  description: "Quadro Geral de Baixa Tensão montado e testado — preço por custo × Fator K.",
  referencePrefix: "QGBT",
});

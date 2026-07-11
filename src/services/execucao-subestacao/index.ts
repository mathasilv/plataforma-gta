import { criarServicoConfigurador } from "../_cpq/configurador";

/**
 * Execução de Subestação — serviço com configurador próprio: precifica por
 * custo × Fator K (modelo real da GTA — ver ./pricing.ts). O configurador monta
 * os itens já precificados e envia o formData; o .docx reusa o molde padrão.
 */
export const execucaoSubestacaoService = criarServicoConfigurador({
  key: "execucao-subestacao",
  label: "Execução de Subestação",
  description: "Precifica a execução por custo × Fator K (equipamentos faturados à parte).",
  referencePrefix: "EXECSE",
});

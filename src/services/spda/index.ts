import { criarServicoConfigurador } from "../_cpq/configurador";

/**
 * SPDA e Gerenciamento de Risco (ABNT NBR 5419) — serviço com configurador
 * próprio: precifica o projeto pelas métricas reais da GTA (risco por bloco +
 * projeto por m², com piso mínimo — ver ./pricing.ts). O SpdaConfigurator monta
 * os itens já precificados e envia o formData; o .docx reusa o molde padrão.
 */
export const spdaService = criarServicoConfigurador({
  key: "spda",
  label: "SPDA e Gerenciamento de Risco",
  description: "Precifica o projeto por bloco (risco) e por m² (projeto) conforme a ABNT NBR 5419.",
  referencePrefix: "SPDA",
});

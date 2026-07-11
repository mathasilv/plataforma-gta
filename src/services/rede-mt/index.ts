import { criarServicoConfigurador } from "../_cpq/configurador";

/**
 * Rede de Distribuição MT/BT — configurador próprio: precifica projeto e/ou
 * execução pelo modelo real da GTA (projeto = custo × Fator K / (1−NF);
 * execução = custo × Fator K — ver ./pricing.ts). O RedeMtConfigurator monta
 * os itens já precificados e envia o formData; o .docx reusa o molde padrão.
 */
export const redeMtService = criarServicoConfigurador({
  key: "rede-mt",
  label: "Rede de Distribuição MT/BT",
  description: "Precifica projeto e/ou execução de rede MT/BT (por custo × Fator K).",
  referencePrefix: "REDEMT",
});

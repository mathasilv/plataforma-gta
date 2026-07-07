import { criarServicoConfigurador } from "../_cpq/configurador";

/**
 * Projeto Elétrico de Baixa Tensão (NBR 5410). Modelo MODULAR por disciplina,
 * fiel às propostas reais da GTA (ex.: Construtora CCB, que somou projeto
 * predial + telecom + gerenciamento de risco em itens separados). O
 * ProjetoBtConfigurator monta um item por disciplina selecionada e soma o total.
 *
 * Âncoras históricas (2026): predial residencial/comercial R$ 5.000–18.450;
 * força industrial (Geolab) R$ 20.000; telecom (CCB) R$ 6.150.
 */
export const projetoEletricoBtService = criarServicoConfigurador({
  key: "projeto-bt",
  label: "Projeto Elétrico (BT)",
  description: "Projeto elétrico predial/industrial de baixa tensão (NBR 5410): força, iluminação, telecom e retrofit — por disciplina.",
  referencePrefix: "PROJBT",
});

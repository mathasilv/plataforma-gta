import { criarServicoConfigurador } from "../_cpq/configurador";

/**
 * Projeto de Subestação — serviço com configurador próprio (dimensionamento
 * automático pela NT.002 da Equatorial — ver ./sizing.ts). O SubestacaoConfigurator
 * calcula o transformador comercial, correntes e proteção, monta os itens de
 * escopo já precificados e envia o formData; o .docx reusa o molde padrão.
 */
export const subestacaoService = criarServicoConfigurador({
  key: "projeto-subestacao",
  label: "Projeto de Subestação",
  description: "Dimensiona o transformador e a proteção pela carga e gera a proposta do projeto.",
  referencePrefix: "PROJSE",
});

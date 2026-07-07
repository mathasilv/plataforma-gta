import { criarServicoConfigurador } from "../_cpq/configurador";

/**
 * Orçamento de Conexão junto à concessionária. REGRA FIXA (gestão): 2 salários
 * mínimos. O ConexaoConfigurator (ServicoSimplesConfigurator) calcula o valor.
 */
export const conexaoConcessionariaService = criarServicoConfigurador({
  key: "conexao",
  label: "Orçamento de Conexão",
  description: "Viabilidade, liberação de carga e acompanhamento junto à concessionária — tabelado em 2 salários mínimos.",
  referencePrefix: "CONEXAO",
});

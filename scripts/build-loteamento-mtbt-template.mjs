/**
 * Molde do serviço Execução de Rede MT/BT em Loteamento — a partir da proposta
 * do Loteamento Residencial Jatobá.
 *   node scripts/build-loteamento-mtbt-template.mjs
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { sub, subInRow, collapseRows, loadDocx, saveDocx } from "./lib/docxmold.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE =
  "C:/Users/teteu/OneDrive/Documentos/OneDrive - GTA/OneDrive/Contratos e Orçamentos/06.26 - Loteamento Residencial Jatobá - Senador Canedo/Proposta_GTA_LoteamentoJatoba_RedesMTBT_v2 (1).docx";
const OUT = path.join(ROOT, "src", "services", "loteamento-mtbt", "template.docx");

let { zip, xml } = loadDocx(SOURCE);

// ----- loops ---------------------------------------------------------------
// composição do investimento 5.1 (2 linhas -> loop)
xml = collapseRows(
  xml,
  "Serviços de engenharia e execução — Rede MT/BT completa",
  "Postes, cabos MT/BT, transformadores, chaves, para-raios, cruzetas, ferragens, isoladores, padrões de entrada e demais componentes. Aquisição direta pelo cliente.",
  [
    ["Serviços de engenharia e execução — Rede MT/BT completa", "{titulo}"],
    ["Projeto, aprovação Equatorial Goiás, ARTs, mão de obra especializada, montagem, lançamento, comissionamento e entrega do dossiê técnico.", "{descricao}"],
    ["GTA Energia Ltda", "{faturamento}"],
    ["01", "{#investimento}{num}"],
    ["R$ 125.000,00", "{valor}{/investimento}"],
  ],
);

// condições de pagamento 5.2 (3 linhas -> loop)
xml = collapseRows(
  xml,
  "Entrada — no ato da aprovação da proposta e assinatura do contrato, para mobilização da equipe e início das atividades",
  "Saldo remanescente — após conclusão integral dos serviços, comissionamento e entrega do dossiê técnico",
  [
    ["Entrada — no ato da aprovação da proposta e assinatura do contrato, para mobilização da equipe e início das atividades", "{evento}"],
    ["1ª", "{#pagamentos}{parcela}"],
    ["60%", "{percentual}"],
    ["R$ 198.000,00", "{valor}{/pagamentos}"],
  ],
);

// cronograma (8 linhas -> loop)
xml = collapseRows(
  xml,
  "Aprovação, contrato e 1ª parcela (60%) + disponibilização dos materiais",
  "Entrega do dossiê técnico e saldo final (10%)",
  [
    ["Aprovação, contrato e 1ª parcela (60%) + disponibilização dos materiais", "{#cronograma}{etapa}"],
    ["Dia D", "{prazo}"],
    ["Cliente + GTA", "{responsavel}{/cronograma}"],
  ],
);

// ----- textos variáveis ----------------------------------------------------
xml = sub(
  xml,
  "A presente Proposta Técnica e Comercial tem por objeto a execução completa da rede de distribuição de energia elétrica em média tensão (MT) e baixa tensão (BT) para o Loteamento Residencial Jatobá, localizado em Senador Canedo/GO, incluindo todos os serviços de engenharia, mão de obra especializada, mobilização de equipamentos e ferramental necessários à implantação integral do sistema de distribuição.",
  "{textoObjeto}",
);
xml = sub(
  xml,
  "O prazo de execução total dos serviços é de 90 (noventa) dias corridos, contados a partir da data de aprovação desta proposta, assinatura do contrato, recebimento da entrada contratual (60%) e disponibilização dos materiais no canteiro de obras pelo cliente.",
  "{textoPrazo}",
);
xml = sub(
  xml,
  "Cento e vinte e cinco mil reais — faturamento GTA Energia (serviços de execução). R$ 205.000,00 — faturamento direto para o cliente (materiais e equipamentos). Investimento total: trezentos e trinta mil reais.",
  "{extensoLinha}",
);
xml = sub(xml, "Esta proposta tem validade de 30 (trinta) dias corridos", "Esta proposta tem validade de {validadePorExtenso} dias corridos");
xml = sub(xml, "O prazo total de 90 dias está condicionado", "O prazo total de {prazoDias} dias está condicionado");

xml = subInRow(xml, "CONCESSIONÁRIA", [["Equatorial Goiás", "{concessionaria}"]]);
xml = subInRow(xml, "CLIENTE", [["Loteamento Residencial Jatobá", "{clienteNome}"]]);

// ----- cabeçalho, valores e aceite -----------------------------------------
const R = [
  ["EXECUÇÃO DE REDE DE DISTRIBUIÇÃO MT/BT  ·  LOTEAMENTO RESIDENCIAL", "{subtitulo}"],
  ["LOTEAMENTO RESIDENCIAL JATOBÁ — SENADOR CANEDO/GO", "{clienteTitulo}"],
  ["Senador Canedo — GO", "{localServico}"],
  ["Execução de Rede de Distribuição de Energia Elétrica MT/BT em Loteamento Residencial", "{objeto}"],
  ["GTA-2026-JATOBA-MTBT-001", "{referencia}"],
  ["Goiânia, 30 de junho de 2026", "{dataEmissao}"],
  ["30 de julho de 2026 (30 dias corridos)", "{validade}"],
  ["90 dias corridos após aprovação da proposta e entrega dos materiais", "{prazoExecucao}"],
  ["60% entrada + 30% medições quinzenais + 10% conclusão", "{formaPagamento}"],
  ["R$ 330.000,00", "{valorTotal}", 2],
  ["90 dias corridos", "{prazoTotal}"],
  ["LOTEAMENTO RESIDENCIAL JATOBÁ", "{clienteNomeUpper}"],
  ["Senador Canedo/GO", "{cidadeUf}"],
];
for (const [s, r, c] of R) xml = sub(xml, s, r, c ?? 1);

// ----- tokens no corpo (contagens verificadas empiricamente) ----------------
xml = sub(xml, "Loteamento Residencial Jatobá", "{nomeLocal}", 3);

saveDocx(zip, xml, OUT);

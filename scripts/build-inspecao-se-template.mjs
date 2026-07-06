/**
 * Molde do serviço Inspeção e Diagnóstico de Subestação — a partir da proposta
 * do Varandas Condomínio Clube.  node scripts/build-inspecao-se-template.mjs
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { sub, collapseRows, loadDocx, saveDocx } from "./lib/docxmold.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE =
  "C:/Users/teteu/OneDrive/Documentos/OneDrive - GTA/OneDrive/Contratos e Orçamentos/06.26 - Condomínio Varandas (João Victor)/Proposta_GTA_Varandas_InspecaoSE.docx";
const OUT = path.join(ROOT, "src", "services", "inspecao-se", "template.docx");

let { zip, xml } = loadDocx(SOURCE);

// ----- loops ---------------------------------------------------------------
xml = collapseRows(
  xml,
  "Inspeção visual completa da subestação com levantamento de parâmetros técnicos e registro fotográfico",
  "Relatório técnico completo de diagnóstico e adequação com parecer conclusivo e recomendações priorizadas",
  [
    ["Inspeção visual completa da subestação com levantamento de parâmetros técnicos e registro fotográfico", "{descricao}"],
    ["01", "{#servicos}{num}"],
    ["—", "{valor}{/servicos}"],
  ],
);

xml = collapseRows(
  xml,
  "No ato da assinatura do contrato — entrada para mobilização da equipe e início dos serviços",
  "Após entrega e apresentação do relatório técnico completo de diagnóstico e adequação ao cliente",
  [
    ["No ato da assinatura do contrato — entrada para mobilização da equipe e início dos serviços", "{evento}"],
    ["1ª", "{#pagamentos}{parcela}"],
    ["50%", "{percentual}"],
    ["R$ 7.500,00", "{valor}{/pagamentos}"],
  ],
);

xml = collapseRows(
  xml,
  "Aprovação, assinatura do contrato e pagamento da 1ª parcela",
  "Entrega e apresentação do relatório ao cliente + 2ª parcela",
  [
    ["Aprovação, assinatura do contrato e pagamento da 1ª parcela", "{#cronograma}{etapa}"],
    ["Dia D", "{prazo}"],
    ["Condomínio + GTA", "{responsavel}{/cronograma}"],
  ],
);

// ----- textos variáveis ----------------------------------------------------
xml = sub(
  xml,
  "A presente Proposta Técnica e Comercial tem por objeto a realização de inspeção técnica especializada na subestação de energia elétrica do Varandas Condomínio Clube, localizado em Anápolis/GO, com foco no diagnóstico das condições operacionais, análise de conformidade dos ajustes de proteção em relação à potência instalada, vistoria termográfica para identificação de pontos quentes e, quando necessário, elaboração de novo estudo de proteção e implementação dos ajustes corretivos.",
  "{textoObjeto}",
);
xml = sub(
  xml,
  "O prazo total de execução é de 15 (quinze) dias corridos, contados a partir da data de aprovação desta proposta, assinatura do contrato e recebimento da entrada contratual.",
  "{textoPrazo}",
);
xml = sub(xml, "(Equatorial Goiás) e com os requisitos", "({concessionaria}) e com os requisitos");
xml = sub(xml, "Deslocamento da equipe técnica e engenheiro responsável até Anápolis/GO;", "Deslocamento da equipe técnica e engenheiro responsável até {cidadeUf};");
xml = sub(xml, "Esta proposta tem validade de 20 (vinte) dias corridos", "Esta proposta tem validade de {validadePorExtenso} dias corridos");

// ----- cabeçalho e valores (do mais longo ao mais curto) --------------------
const R = [
  ["INSPEÇÃO E DIAGNÓSTICO DE SUBESTAÇÃO  ·  ANÁLISE DE PROTEÇÃO  ·  TERMOGRAFIA", "{subtitulo}"],
  ["VARANDAS CONDOMÍNIO CLUBE — ANÁPOLIS/GO", "{clienteTitulo}"],
  ["Vila Industrial — Anápolis/GO — CEP: 75115-100", "{endereco}"],
  ["Inspeção, Diagnóstico e Adequação de Proteção da Subestação", "{objeto}"],
  ["GTA-2026-VARANDAS-SE-001", "{referencia}"],
  ["Goiânia, 29 de maio de 2026", "{dataEmissao}"],
  ["18 de junho de 2026 (20 dias corridos)", "{validade}"],
  ["15 dias corridos após aprovação e assinatura do contrato", "{prazoExecucao}"],
  ["50% na entrada + 50% após entrega do relatório", "{formaPagamento}"],
  ["R$ 15.000,00", "{valorTotal}"],
  ["Quinze mil reais.", "{valorTotalExtenso}"],
  ["15 dias corridos", "{prazoTotal}"],
  ["VARANDAS CONDOMÍNIO CLUBE", "{clienteNomeUpper}"],
  ["Varandas Condomínio Clube", "{clienteNome}"],
  ["Anápolis/GO", "{cidadeUf}"],
];
for (const [s, r, c] of R) xml = sub(xml, s, r, c ?? 1);

saveDocx(zip, xml, OUT);

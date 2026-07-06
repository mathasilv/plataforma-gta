/**
 * Molde do serviço Execução de Subestação — a partir da proposta Fazenda Rio
 * Doce (SE 750 kVA em cubículo).
 *   node scripts/build-execucao-se-template.mjs
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { sub, subInRow, collapseRows, loadDocx, saveDocx } from "./lib/docxmold.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE =
  "C:/Users/teteu/OneDrive/Documentos/OneDrive - GTA/OneDrive/Contratos e Orçamentos/06.26 - Fazenda Rio Doce/Orçamento - Execução SE 750kVA/Proposta_GTA_FazendaRioDoce_SE750kVA.docx";
const OUT = path.join(ROOT, "src", "services", "execucao-se", "template.docx");

let { zip, xml } = loadDocx(SOURCE);

// ----- loops ---------------------------------------------------------------
// dados técnicos (8 linhas -> loop)
xml = collapseRows(xml, "Tipo de Subestação", "Local de Instalação", [
  ["Cubículo de Média Tensão (Abrigada)", "{valor}{/parametros}"],
  ["Tipo de Subestação", "{#parametros}{parametro}"],
]);

// composição do investimento 6.1 (2 linhas -> loop)
xml = collapseRows(
  xml,
  "Serviços de execução — Subestação 750 kVA / 13,8 kV",
  "Transformador 750 kVA, cubículo, chave MT, para-raios, TCs, TPs, medidor, QGBT, cabos MT/BT, aterramento e demais componentes. Aquisição direta pelo cliente conforme projeto aprovado.",
  [
    ["Serviços de execução — Subestação 750 kVA / 13,8 kV", "{titulo}"],
    ["Obra civil, instalação de equipamentos de MT e BT, aterramento, comissionamento, vistoria e entrega do dossiê técnico. Mão de obra e mobilização inclusos.", "{descricao}"],
    ["GTA Energia Ltda", "{faturamento}"],
    ["01", "{#investimento}{num}"],
    ["R$ 160.000,00", "{valor}{/investimento}"],
  ],
);

// condições de pagamento 6.2 (3 linhas -> loop)
xml = collapseRows(
  xml,
  "Entrada — no ato da aprovação da proposta, assinatura do contrato e disponibilização dos equipamentos, para mobilização e início das atividades",
  "Saldo remanescente — após energização da subestação pela Equatorial Goiás e entrega do dossiê técnico completo",
  [
    ["Entrada — no ato da aprovação da proposta, assinatura do contrato e disponibilização dos equipamentos, para mobilização e início das atividades", "{evento}"],
    ["1ª", "{#pagamentos}{parcela}"],
    ["60%", "{percentual}"],
    ["R$ 237.000,00", "{valor}{/pagamentos}"],
  ],
);

// cronograma (9 linhas -> loop)
xml = collapseRows(
  xml,
  "Aprovação, contrato, 1ª parcela (60%) + projeto aprovado + equipamentos disponíveis",
  "Entrega do dossiê técnico e pagamento do saldo final (10%)",
  [
    ["Aprovação, contrato, 1ª parcela (60%) + projeto aprovado + equipamentos disponíveis", "{#cronograma}{etapa}"],
    ["Dia D", "{prazo}"],
    ["Fazenda Rio Doce + GTA", "{responsavel}{/cronograma}"],
  ],
);

// ----- textos variáveis ----------------------------------------------------
xml = sub(
  xml,
  "A presente Proposta Técnica e Comercial tem por objeto a execução completa da Subestação de Energia em Cubículo de 750 kVA em 13,8 kV para atendimento elétrico da Fazenda Rio Doce, localizada em zona rural do município de Bela Vista de Goiás/GO, incluindo todos os serviços de engenharia, mão de obra especializada, mobilização de equipamentos e ferramental necessários à implantação integral da subestação.",
  "{textoObjeto}",
);
xml = sub(
  xml,
  "O prazo total de execução dos serviços é de 120 (cento e vinte) dias corridos, contados a partir do cumprimento simultâneo das seguintes condições: aprovação desta proposta, assinatura do contrato, recebimento da entrada contratual (60%), apresentação do projeto aprovado pela Equatorial Goiás e disponibilização integral de todos os equipamentos e materiais pela Fazenda Rio Doce.",
  "{textoPrazo}",
);
xml = sub(xml, "Esta proposta tem validade de 30 (trinta) dias corridos", "Esta proposta tem validade de {validadePorExtenso} dias corridos");
xml = sub(xml, "O prazo de 120 dias", "O prazo de {prazoDias} dias", 2);
xml = sub(xml, "Trezentos e noventa e cinco mil reais.", "{valorTotalExtenso}");

xml = subInRow(xml, "CONCESSIONÁRIA", [["Equatorial Goiás", "{concessionaria}"]]);

// ----- cabeçalho, valores e aceite -----------------------------------------
const R = [
  ["EXECUÇÃO DE SUBESTAÇÃO DE MÉDIA TENSÃO  ·  750 kVA  ·  13,8 kV", "{subtitulo}"],
  ["FAZENDA RIO DOCE — BELA VISTA DE GOIÁS/GO", "{clienteTitulo}"],
  ["Fazenda Rio Doce — Carlos Roberto Viana", "{clienteNome}"],
  ["Zona Rural — Bela Vista de Goiás/GO", "{localServico}"],
  ["Execução de Subestação de Média Tensão — 750 kVA — 13,8 kV / 380-220 V", "{objeto}"],
  ["GTA-2026-FAZENDA-SE-001", "{referencia}"],
  ["Goiânia, 30 de junho de 2026", "{dataEmissao}"],
  ["30 de julho de 2026 (30 dias corridos)", "{validade}"],
  ["120 dias corridos após aprovação e entrega dos materiais (condicionado ao projeto aprovado)", "{prazoExecucao}"],
  ["60% entrada + 30% medições quinzenais + 10% conclusão", "{formaPagamento}"],
  ["R$ 395.000,00", "{valorTotal}", 2],
  ["120 dias corridos", "{prazoTotal}"],
  ["FAZENDA RIO DOCE", "{aceiteNome}"],
  ["Carlos Roberto Viana", "{aceiteResponsavel}"],
];
for (const [s, r, c] of R) xml = sub(xml, s, r, c ?? 1);

// ----- tokens técnicos no corpo (contagens verificadas empiricamente) -------
xml = sub(xml, "Fazenda Rio Doce", "{nomeLocal}", 4);
xml = sub(xml, "750 kVA", "{potencia}", 5);
xml = sub(xml, "13,8 kV", "{tensaoMT}", 4);
xml = sub(xml, "1.139 A", "{correnteBT}", 2);
xml = sub(xml, "Bela Vista de Goiás/GO", "{cidadeLocal}", 1);

saveDocx(zip, xml, OUT);

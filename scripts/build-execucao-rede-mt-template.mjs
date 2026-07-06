/**
 * Molde do serviço Execução de Rede de Distribuição MT — a partir da proposta
 * Fazenda Rio Doce (1 km, 13,8 kV).
 *   node scripts/build-execucao-rede-mt-template.mjs
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { sub, subInRow, collapseRows, loadDocx, saveDocx } from "./lib/docxmold.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE =
  "C:/Users/teteu/OneDrive/Documentos/OneDrive - GTA/OneDrive/Contratos e Orçamentos/06.26 - Fazenda Rio Doce/Orçamento - Execução SE 750kVA/Proposta_GTA_FazendaRioDoce_ExecucaoMT13_8kV.docx";
const OUT = path.join(ROOT, "src", "services", "execucao-rede-mt", "template.docx");

let { zip, xml } = loadDocx(SOURCE);

// ----- loops ---------------------------------------------------------------
// composição do investimento 5.1 (2 linhas -> loop)
xml = collapseRows(
  xml,
  "Serviços de execução — Rede MT 13,8 kV (≈ 1 km rural)",
  "Postes, cabos de alumínio, cruzetas, ferragens, isoladores, para-raios, chaves fusíveis, aterramento e demais componentes. Aquisição direta pelo cliente conforme projeto aprovado.",
  [
    ["Serviços de execução — Rede MT 13,8 kV (≈ 1 km rural)", "{titulo}"],
    ["Mão de obra especializada: escavação, içamento de postes, montagem de estruturas, lançamento de cabos, proteções, aterramento e comissionamento.", "{descricao}"],
    ["GTA Energia Ltda", "{faturamento}"],
    ["01", "{#investimento}{num}"],
    ["R$ 60.000,00", "{valor}{/investimento}"],
  ],
);

// condições de pagamento 5.2 (3 linhas -> loop)
xml = collapseRows(
  xml,
  "Entrada — no ato da aprovação da proposta, assinatura do contrato e disponibilização dos materiais no canteiro de obras, para mobilização da equipe e início das atividades",
  "Saldo remanescente — após conclusão integral dos serviços, vistoria da Equatorial Goiás e entrega do relatório fotográfico ao cliente",
  [
    ["Entrada — no ato da aprovação da proposta, assinatura do contrato e disponibilização dos materiais no canteiro de obras, para mobilização da equipe e início das atividades", "{evento}"],
    ["1ª", "{#pagamentos}{parcela}"],
    ["60%", "{percentual}"],
    ["R$ 93.000,00", "{valor}{/pagamentos}"],
  ],
);

// cronograma (8 linhas -> loop)
xml = collapseRows(
  xml,
  "Aprovação, contrato, 1ª parcela (60%) + projeto aprovado + materiais no canteiro",
  "Entrega do relatório fotográfico e pagamento do saldo final (10%)",
  [
    ["Aprovação, contrato, 1ª parcela (60%) + projeto aprovado + materiais no canteiro", "{#cronograma}{etapa}"],
    ["Dia D", "{prazo}"],
    ["Fazenda Rio Doce + GTA", "{responsavel}{/cronograma}"],
  ],
);

// ----- textos variáveis ----------------------------------------------------
xml = sub(
  xml,
  "A presente Proposta Técnica e Comercial tem por objeto a execução da rede de distribuição de energia elétrica em média tensão 13,8 kV, com extensão aproximada de 1 (um) quilômetro em zona rural, para atendimento da Fazenda Rio Doce, localizada no município de Bela Vista de Goiás/GO, incluindo todos os serviços de engenharia, mão de obra especializada, mobilização de equipamentos e ferramental necessários à implantação integral do ramal de média tensão.",
  "{textoObjeto}",
);
xml = sub(
  xml,
  "O prazo total de execução dos serviços é de 120 (cento e vinte) dias corridos, contados a partir do cumprimento simultâneo das seguintes condições: aprovação desta proposta, assinatura do contrato, recebimento da entrada contratual (60%), apresentação do projeto aprovado pela Equatorial Goiás e disponibilização integral dos materiais pela Fazenda Rio Doce no canteiro de obras.",
  "{textoPrazo}",
);
xml = sub(xml, "Itens Inclusos nos Serviços GTA Energia (R$ 155.000,00)", "Itens Inclusos nos Serviços GTA Energia ({valorTotal})");
xml = sub(xml, "Esta proposta tem validade de 30 (trinta) dias corridos", "Esta proposta tem validade de {validadePorExtenso} dias corridos");
xml = sub(xml, "O prazo de 120 dias", "O prazo de {prazoDias} dias", 2);
xml = sub(xml, "Cento e cinquenta e cinco mil reais.", "{valorTotalExtenso}");

xml = subInRow(xml, "CONCESSIONÁRIA", [["Equatorial Goiás", "{concessionaria}"]]);

// ----- cabeçalho, valores e aceite -----------------------------------------
const R = [
  ["EXECUÇÃO DE REDE DE DISTRIBUIÇÃO 13,8 kV  ·  ≈ 1 km  ·  ZONA RURAL", "{subtitulo}"],
  ["FAZENDA RIO DOCE — BELA VISTA DE GOIÁS/GO", "{clienteTitulo}"],
  ["Fazenda Rio Doce — Carlos Roberto Viana", "{clienteNome}"],
  ["Zona Rural — Bela Vista de Goiás/GO", "{localServico}"],
  ["Execução de Rede de Distribuição 13,8 kV — Extensão ≈ 1 km — Zona Rural", "{objeto}"],
  ["GTA-2026-FAZENDA-MT-001", "{referencia}"],
  ["Goiânia, 30 de junho de 2026", "{dataEmissao}"],
  ["30 de julho de 2026 (30 dias corridos)", "{validade}"],
  ["120 dias corridos após aprovação e entrega dos materiais (condicionado ao projeto aprovado)", "{prazoExecucao}"],
  ["60% entrada + 30% medições quinzenais + 10% conclusão", "{formaPagamento}"],
  ["R$ 155.000,00", "{valorTotal}", 2],
  ["120 dias corridos", "{prazoTotal}"],
  ["FAZENDA RIO DOCE", "{aceiteNome}"],
  ["Carlos Roberto Viana", "{aceiteResponsavel}"],
];
for (const [s, r, c] of R) xml = sub(xml, s, r, c ?? 1);

// ----- tokens técnicos no corpo (contagens verificadas empiricamente) -------
xml = sub(xml, "Fazenda Rio Doce", "{nomeLocal}", 5);
xml = sub(xml, "13,8 kV", "{tensaoMT}", 7);
xml = sub(xml, "13,8kV", "{tensaoMT}", 1);
xml = sub(xml, "Bela Vista de Goiás/GO", "{cidadeLocal}", 1);
xml = sub(xml, "aproximadamente 1 km", "aproximadamente {extensao}", 1);
xml = sub(xml, "1Km", "{extensao}", 1);
xml = sub(xml, "1km", "{extensao}", 1);
xml = sub(xml, "(≈ 1 km)", "(≈ {extensao})", 1);

saveDocx(zip, xml, OUT);

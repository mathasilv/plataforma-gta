/**
 * Molde do serviço Projeto de Rede de Distribuição MT — a partir do orçamento
 * Carlos Viana (RD 13,8 kV, travessia GO-147).
 *   node scripts/build-projeto-rede-mt-template.mjs
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { sub, subInRow, collapseRows, collapseParas, loadDocx, saveDocx } from "./lib/docxmold.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE =
  "C:/Users/teteu/OneDrive/Documentos/OneDrive - GTA/OneDrive/Contratos e Orçamentos/06.26 - Fazenda Rio Doce/Orçamento - Projeto de Rede MT- 1km/Proposta_GTA_CarlosViana_ProjRD13_8kV.docx";
const OUT = path.join(ROOT, "src", "services", "projeto-rede-mt", "template.docx");

let { zip, xml } = loadDocx(SOURCE);

// ----- loops ---------------------------------------------------------------
// tabela de serviços 5.1 (4 linhas -> loop)
xml = collapseRows(
  xml,
  "Levantamento técnico de campo — visita à Fazenda Rio Doce e trecho GO-147, coleta de dados, registro fotográfico e instrução do processo junto ao GOINFRA/DNIT",
  "Emissão de ART junto ao CREA/GO referente à elaboração do projeto elétrico da RD 13,8 kV",
  [
    ["Levantamento técnico de campo — visita à Fazenda Rio Doce e trecho GO-147, coleta de dados, registro fotográfico e instrução do processo junto ao GOINFRA/DNIT", "{descricao}"],
    ["01", "{#servicos}{num}"],
    ["—", "{valor}{/servicos}"],
  ],
);

// pagamento sugerido (3 bullets -> bloco de loop)
xml = collapseParas(
  xml,
  "50% no ato da aprovação deste orçamento e início do levantamento de campo (R$ 5.250,00);",
  "20% na obtenção da Autorização de Construção da Equatorial Goiás (R$ 2.100,00).",
  [["50% no ato da aprovação deste orçamento e início do levantamento de campo (R$ 5.250,00);", "{linha}"]],
  "pagamentos",
);

// cronograma (8 linhas -> loop)
xml = collapseRows(
  xml,
  "Aprovação do orçamento e pagamento da 1ª parcela",
  "Emissão da ART, entrega do dossiê e 2ª parcela",
  [
    ["Aprovação do orçamento e pagamento da 1ª parcela", "{#cronograma}{etapa}"],
    ["Dia D", "{prazo}"],
    ["Cliente + GTA", "{responsavel}{/cronograma}"],
  ],
);

// ----- textos variáveis ----------------------------------------------------
xml = sub(
  xml,
  "O presente Orçamento Técnico e Comercial tem por objeto a elaboração do Projeto Elétrico Executivo da Rede de Distribuição em Média Tensão (RD 13,8 kV), contemplando a travessia da Rodovia GO-147 em extensão aproximada de 1 (um) quilômetro, para atendimento elétrico da Fazenda Rio Doce, localizada em zona rural do município de Bela Vista de Goiás/GO.",
  "{textoObjeto}",
);
xml = sub(
  xml,
  "O prazo total para elaboração, aprovação e entrega do projeto completo é de 6 (seis) meses, contados a partir da aprovação deste orçamento e do recebimento da entrada contratual.",
  "{textoPrazo}",
);
xml = sub(xml, "Este orçamento tem validade de 30 (trinta) dias corridos", "Este orçamento tem validade de {validadePorExtenso} dias corridos");
xml = sub(xml, "O prazo de 6 meses está sujeito", "O prazo de {prazoTotal} está sujeito");

xml = subInRow(xml, "CONCESSIONÁRIA", [["Equatorial Goiás", "{concessionaria}"]]);

// ----- cabeçalho, valores e aceite -----------------------------------------
const R = [
  ["PROJETO DE REDE DE DISTRIBUIÇÃO 13,8 kV  ·  TRAVESSIA GO-147  ·  ZONA RURAL", "{subtitulo}"],
  ["CARLOS ROBERTO VIANA — FAZENDA RIO DOCE — BELA VISTA DE GOIÁS/GO", "{clienteTitulo}"],
  ["Fazenda Rio Doce — Zona Rural — Bela Vista de Goiás/GO", "{localServico}"],
  ["Projeto de RD 13,8 kV com Travessia GO-147 (≈ 1 km) e Aprovação junto à Equatorial Goiás", "{objeto}"],
  ["GTA-2026-CARLOS-RD-001", "{referencia}"],
  ["Goiânia, 30 de junho de 2026", "{dataEmissao}"],
  ["30 de julho de 2026 (30 dias corridos)", "{validade}"],
  ["6 meses corridos após aprovação desta proposta", "{prazoExecucao}"],
  ["A Combinar", "{formaPagamento}"],
  ["Carlos Roberto Viana", "{clienteNome}"],
  ["R$ 10.500,00", "{valorTotal}"],
  ["Dez mil e quinhentos reais.", "{valorTotalExtenso}"],
  ["6 meses", "{prazoTotal}"],
  ["CARLOS ROBERTO VIANA", "{clienteNomeUpper}"],
  ["Fazenda Rio Doce — Bela Vista de Goiás/GO", "{aceiteLocal}"],
];
for (const [s, r, c] of R) xml = sub(xml, s, r, c ?? 1);

// ----- tokens técnicos no corpo (contagens verificadas empiricamente) -------
xml = sub(xml, "Fazenda Rio Doce", "{nomeLocal}", 5);
xml = sub(xml, "GO-147", "{rodovia}", 11);
xml = sub(xml, "13,8 kV", "{tensaoMT}", 8);
xml = sub(xml, "Bela Vista de Goiás/GO", "{cidadeLocal}", 1);

saveDocx(zip, xml, OUT);

/**
 * Molde do serviço Projeto de Subestação — a partir da proposta Carlos Viana
 * (SE 750 kVA / 13,8 kV).  node scripts/build-projeto-se-template.mjs
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { sub, subInRow, collapseRows, collapseParas, loadDocx, saveDocx } from "./lib/docxmold.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE =
  "C:/Users/teteu/OneDrive/Documentos/OneDrive - GTA/OneDrive/Contratos e Orçamentos/06.26 - Fazenda Rio Doce/Orçamento - Projeto SE 750kVA/Proposta_GTA_CarlosViana_ProjSE750kVA_v2.docx";
const OUT = path.join(ROOT, "src", "services", "projeto-se", "template.docx");

let { zip, xml } = loadDocx(SOURCE);

// ----- loops ---------------------------------------------------------------
// dados técnicos (9 linhas -> loop)
xml = collapseRows(xml, "Tipo de Subestação", "Local de Instalação", [
  ["Cubículo de Média Tensão (Abrigada)", "{valor}{/parametros}"],
  ["Tipo de Subestação", "{#parametros}{parametro}"],
]);

// tabela de serviços 6.1 (4 linhas -> loop); totais ficam com marcadores
xml = collapseRows(
  xml,
  "Levantamento técnico de campo — visita à Fazenda Rio Doce, coleta de dados de carga e demanda, análise de viabilidade do ponto de conexão 13,8 kV e definição do local do cubículo",
  "Emissão de ART junto ao CREA/GO referente à elaboração do projeto da subestação 750 kVA / 13,8 kV",
  [
    ["Levantamento técnico de campo — visita à Fazenda Rio Doce, coleta de dados de carga e demanda, análise de viabilidade do ponto de conexão 13,8 kV e definição do local do cubículo", "{descricao}"],
    ["01", "{#servicos}{num}"],
    ["—", "{valor}{/servicos}"],
  ],
);

// pagamento sugerido (3 bullets -> bloco de loop)
xml = collapseParas(
  xml,
  "50% no ato da aprovação desta proposta e realização do levantamento de campo (R$ 7.625,00);",
  "20% na obtenção da Autorização de Construção da Equatorial Goiás (R$ 3.050,00).",
  [["50% no ato da aprovação desta proposta e realização do levantamento de campo (R$ 7.625,00);", "{linha}"]],
  "pagamentos",
);

// cronograma (7 linhas -> loop)
xml = collapseRows(
  xml,
  "Aprovação da proposta, contrato e 1ª parcela (50%)",
  "Emissão da ART, entrega do dossiê técnico e 2ª parcela (50%)",
  [
    ["Aprovação da proposta, contrato e 1ª parcela (50%)", "{#cronograma}{etapa}"],
    ["Dia D", "{prazo}"],
    ["Cliente + GTA", "{responsavel}{/cronograma}"],
  ],
);

// ----- textos variáveis ----------------------------------------------------
xml = sub(
  xml,
  "A presente Proposta Técnica e Comercial tem por objeto a elaboração do Projeto Elétrico Executivo da Subestação de Energia em Cubículo de 750 kVA em 13,8 kV, destinada ao atendimento das cargas elétricas da Fazenda Rio Doce, localizada em zona rural do município de Bela Vista de Goiás/GO.",
  "{textoObjeto}",
);
xml = sub(
  xml,
  "Com base na demanda elétrica da Fazenda Rio Doce e nas características do sistema de fornecimento da Equatorial Goiás na região, os principais parâmetros da subestação projetada são:",
  "{textoDadosIntro}",
);
xml = sub(
  xml,
  "O prazo total para elaboração, aprovação e entrega do projeto completo é de 6 (seis) meses, contados a partir da aprovação desta proposta e do recebimento da entrada contratual.",
  "{textoPrazo}",
);
xml = sub(xml, "Esta proposta tem validade de 30 (trinta) dias corridos", "Esta proposta tem validade de {validadePorExtenso} dias corridos");
xml = sub(xml, "O prazo de 6 meses está sujeito", "O prazo de {prazoTotal} está sujeito");

// concessionária (linha do cabeçalho)
xml = subInRow(xml, "CONCESSIONÁRIA", [["Equatorial Goiás", "{concessionaria}"]]);

// ----- cabeçalho, valores e aceite -----------------------------------------
const R = [
  ["PROJETO DE SUBESTAÇÃO EM CUBÍCULO  ·  750 kVA  ·  13,8 kV  ·  ZONA RURAL", "{subtitulo}"],
  ["CARLOS ROBERTO VIANA — FAZENDA RIO DOCE — BELA VISTA DE GOIÁS/GO", "{clienteTitulo}"],
  ["Fazenda Rio Doce — Zona Rural — Bela Vista de Goiás/GO", "{localServico}"],
  ["Projeto de Subestação em Cubículo — 750 kVA — 13,8 kV / 380-220 V", "{objeto}"],
  ["GTA-2026-CARLOS-SE-001", "{referencia}"],
  ["Goiânia, 30 de junho de 2026", "{dataEmissao}"],
  ["30 de julho de 2026 (30 dias corridos)", "{validade}"],
  ["6 meses corridos após aprovação desta proposta", "{prazoExecucao}"],
  ["A Combinar", "{formaPagamento}"],
  ["Carlos Roberto Viana", "{clienteNome}"],
  ["R$ 18.500,00", "{valorSemDesconto}"],
  ["R$ 3.250,00", "{valorDesconto}"],
  ["R$ 15.250,00", "{valorTotal}"],
  ["Quinze mil, duzentos e cinquenta reais.", "{valorTotalExtenso}"],
  ["6 meses", "{prazoTotal}"],
  ["CARLOS ROBERTO VIANA", "{clienteNomeUpper}"],
  ["Fazenda Rio Doce — Bela Vista de Goiás/GO", "{aceiteLocal}"],
];
for (const [s, r, c] of R) xml = sub(xml, s, r, c ?? 1);

// ----- tokens técnicos no corpo (contagens verificadas) ---------------------
xml = sub(xml, "Fazenda Rio Doce", "{nomeLocal}", 2);
xml = sub(xml, "750 kVA", "{potencia}", 5);
xml = sub(xml, "13,8 kV", "{tensaoMT}", 5);
xml = sub(xml, "1.139 A", "{correnteBT}", 1);
xml = sub(xml, "Bela Vista de Goiás/GO", "{cidadeLocal}", 1);

saveDocx(zip, xml, OUT);

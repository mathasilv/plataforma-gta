/**
 * Molde do serviço SPDA + Análise de Gerenciamento de Risco — a partir do
 * orçamento do CESSG.  node scripts/build-spda-template.mjs
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { sub, collapseRows, collapseParas, loadDocx, saveDocx } from "./lib/docxmold.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE =
  "C:/Users/teteu/OneDrive/Documentos/OneDrive - GTA/OneDrive/Contratos e Orçamentos/06.26 - SPDA Centro de Ensino Superior do Sudoeste Goiano/Orcamento_GTA_CESSG_SPDA.docx";
const OUT = path.join(ROOT, "src", "services", "spda", "template.docx");

let { zip, xml } = loadDocx(SOURCE);

// ----- loops ---------------------------------------------------------------
xml = collapseParas(
  xml,
  "50% no ato da aprovação do orçamento e realização da visita técnica (R$ 10.935,00);",
  "50% na entrega de todos os documentos técnicos e ARTs (R$ 10.935,00).",
  [["50% no ato da aprovação do orçamento e realização da visita técnica (R$ 10.935,00);", "{linha}"]],
  "pagamentos",
);

xml = collapseRows(
  xml,
  "Aprovação e recebimento da entrada contratual",
  "Entrega dos documentos ao cliente + última parcela",
  [
    ["Aprovação e recebimento da entrada contratual", "{#cronograma}{etapa}"],
    ["Dia D", "{prazo}"],
    ["Cliente + GTA", "{responsavel}{/cronograma}"],
  ],
);

// ----- textos variáveis ----------------------------------------------------
xml = sub(
  xml,
  "O presente Orçamento Técnico e Comercial tem por objeto a prestação de serviços de engenharia elétrica para elaboração do Projeto de Análise de Gerenciamento de Risco e do Projeto de SPDA (Sistema de Proteção contra Descargas Atmosféricas) para o Centro de Ensino Superior do Sudoeste Goiano LTDA, localizado em Quirinópolis/GO.",
  "{textoObjeto}",
);
xml = sub(
  xml,
  "Deslocamento da equipe técnica à Rua Secundino Pereira Alves, Q7-A, L1 — Residencial Morumbi, Quirinópolis/GO;",
  "{textoDeslocamento}",
);
xml = sub(
  xml,
  "O prazo estimado de entrega dos documentos técnicos é de 45 dias corridos, contados a partir da aprovação deste orçamento, recebimento da entrada contratual e realização da visita técnica ao local.",
  "{textoPrazo}",
);
xml = sub(xml, "Deslocamento da equipe técnica ao local (Quirinópolis/GO).", "Deslocamento da equipe técnica ao local ({cidadeUf}).");
xml = sub(xml, "Este orçamento tem validade de 20 (vinte) dias corridos", "Este orçamento tem validade de {validadePorExtenso} dias corridos");
xml = sub(
  xml,
  "Vinte e um mil, oitocentos e setenta reais (sendo R$ 9.900,00 referente ao gerenciamento de risco e R$ 11.970,00 referente ao projeto de SPDA).",
  "{valorTotalExtenso}",
);

// ----- cabeçalho e valores (do mais longo ao mais curto) --------------------
const R = [
  ["ANÁLISE DE GERENCIAMENTO DE RISCO  ·  PROJETO DE SPDA — NBR 5419", "{subtitulo}"],
  ["CENTRO DE ENSINO SUPERIOR DO SUDOESTE GOIANO LTDA — QUIRINÓPOLIS/GO", "{clienteTitulo}"],
  ["Rua Secundino Pereira Alves, Q7-A, L1 — Residencial Morumbi — Quirinópolis/GO", "{endereco}"],
  ["Análise de Gerenciamento de Risco + Projeto de SPDA — conforme ABNT NBR 5419", "{objeto}"],
  ["Centro de Ensino Superior do Sudoeste Goiano LTDA", "{clienteNome}"],
  ["GTA-2026-CESSG-SPDA-001", "{referencia}"],
  ["Goiânia, 10 de junho de 2026", "{dataEmissao}"],
  ["30 de junho de 2026 (20 dias corridos)", "{validade}"],
  ["A Combinar", "{formaPagamento}"],
  ["R$ 9.900,00", "{valorRisco}"],
  ["R$ 11.970,00", "{valorProjeto}"],
  ["R$ 21.870,00", "{valorTotal}"],
  ["45 dias corridos", "{prazoTotal}"],
  ["CENTRO DE ENSINO SUPERIOR DO", "{aceiteLinha1}"],
  ["SUDOESTE GOIANO LTDA", "{aceiteLinha2}"],
  ["Quirinópolis/GO", "{cidadeUf}"],
];
for (const [s, r, c] of R) xml = sub(xml, s, r, c ?? 1);

saveDocx(zip, xml, OUT);

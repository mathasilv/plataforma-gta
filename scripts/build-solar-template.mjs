/**
 * Constrói o molde src/services/solar/template.docx a partir de uma proposta
 * Solar real (Maria Selma — WEG). Reproduzível: reexecute para regerar o molde.
 *
 *   node scripts/build-solar-template.mjs
 *
 * O que faz:
 *  1. Substitui os valores por marcadores docxtemplater ({campo}) — com asserção
 *     de contagem (falha se um texto não for encontrado, evitando molde silenciosamente errado).
 *  2. Colapsa a tabela de simulação (12 meses) e a de materiais em UMA linha de loop.
 *  3. Remove arquivos-lixo do zip (fragmentos .txt/.xml soltos na raiz).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import PizZip from "pizzip";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const SOURCE =
  "C:/Users/teteu/OneDrive/Documentos/OneDrive - GTA/OneDrive/Contratos e Orçamentos/06.26 - Orçamento Solar - Maria Selma - Goiânia/PROPOSTA_COMERCIAL_-_MARIA_SELMA_WEG.docx";
const OUT = path.join(ROOT, "src", "services", "solar", "template.docx");

// ----- helpers -------------------------------------------------------------

/** Substitui `search` por `replace` em `xml`, exigindo exatamente `count` ocorrências. */
function sub(xml, search, replace, count = 1) {
  const parts = xml.split(search);
  const found = parts.length - 1;
  if (found !== count) {
    throw new Error(
      `Esperava ${count} ocorrência(s) de:\n  «${search.slice(0, 90)}...»\nmas encontrou ${found}.`,
    );
  }
  return parts.join(replace);
}

/** Retorna {start,end} do <w:tr>...</w:tr> que contém `needle`. */
function rowAround(xml, needle) {
  const idx = xml.indexOf(needle);
  if (idx < 0) throw new Error(`Texto não encontrado para linha: «${needle}»`);
  const start = xml.lastIndexOf("<w:tr", idx);
  const endTag = "</w:tr>";
  const end = xml.indexOf(endTag, idx) + endTag.length;
  if (start < 0 || end < endTag.length) throw new Error(`Linha não delimitada: «${needle}»`);
  return { start, end, text: xml.slice(start, end) };
}

const t = (inner) => `<w:t>${inner}</w:t>`;

// ----- carrega ------------------------------------------------------------

const buf = fs.readFileSync(SOURCE);
const zip = new PizZip(buf);
let xml = zip.file("word/document.xml").asText();

// ----- 1. tabela de simulação (12 meses -> 1 linha de loop) ---------------

const janRow = rowAround(xml, ">Janeiro<");
const totalRow = rowAround(xml, "TOTAL ANUAL ESTIMADO");

let simTemplateRow = janRow.text;
simTemplateRow = sub(simTemplateRow, t("Janeiro"), t("{#simulacao}{mes}"));
simTemplateRow = sub(simTemplateRow, t("5,484"), t("{insolacao}"));
simTemplateRow = sub(simTemplateRow, t("963,92"), t("{energia}"));
simTemplateRow = sub(simTemplateRow, t("412,00"), t("{consumo}{/simulacao}"));

// região = da 1ª linha de mês até imediatamente antes da linha TOTAL
const simRegion = xml.slice(janRow.start, totalRow.start);
xml = sub(xml, simRegion, simTemplateRow);

// ----- 2. tabela de materiais (N linhas -> 1 linha de loop) ---------------

const firstMat = rowAround(xml, "MÓDULO - CÉLULA N-TYPE BC 630 WP - LONGI");
const lastMat = rowAround(xml, "ESTRUTURA PARA TELHADO METÁLICO 4 MÓDULOS EM RETRATO (PERFIL 55CM)");

let matTemplateRow = firstMat.text;
matTemplateRow = sub(matTemplateRow, t("12"), t("{#materiais}{qtde}"));
matTemplateRow = sub(
  matTemplateRow,
  t("MÓDULO - CÉLULA N-TYPE BC 630 WP - LONGI"),
  t("{descricao}{/materiais}"),
);

const matRegion = xml.slice(firstMat.start, lastMat.end);
xml = sub(xml, matRegion, matTemplateRow);

// ----- 3. substituições escalares -----------------------------------------

const R = [
  // cabeçalho
  [t("SISTEMA FOTOVOLTAICO CONECTADO À REDE  ·  MICROGERAÇÃO SOLAR ON-GRID"), t("{subtitulo}")],
  [t("MARIA SELMA — GOIÂNIA/GO"), t("{clienteTitulo}")],
  [t("Maria Selma — Goiânia/GO"), t("{clienteCidade}")],
  [t("Implantação de Sistema de Microgeração Solar Fotovoltaica On-Grid"), t("{objeto}")],
  [t("GTA-2026-MARIASELMA-SOLAR-003"), t("{referencia}")],
  [t("Goiânia, 01 de julho de 2026"), t("{dataEmissao}")],
  [t("21 de julho de 2026 (20 dias corridos)"), t("{validade}")],
  [t("A combinar"), t("{formaPagamento}"), 2],
  // objetivo
  [
    t(
      "A presente proposta tem como objetivo a implantação de um sistema de microgeração de energia solar fotovoltaica conectada à rede elétrica (On-Grid) na residência da Sra. Maria Selma, em Goiânia/GO, proporcionando redução nos custos com energia elétrica através da geração própria de energia limpa e renovável.",
    ),
    t("{textoObjetivo}"),
  ],
  // dimensionamento
  [t("630 W"), t("{potenciaPainel}")],
  [t("12 unidades"), t("{qtdPaineis}")],
  [t("7,56 kWp"), t("{potenciaTotal}")],
  [t("6 kWp"), t("{potenciaInversor}")],
  [t("26,00%"), t("{overload}")],
  [t("1 unidade"), t("{qtdInversores}")],
  [t("Potência do Inversor (kWp)"), t("{labelPotInversor}")],
  [t("Quantidade de Inversores"), t("{labelQtdInversores}")],
  // simulação totais
  [t("10.880,01 kWh"), t("{totalEnergia}")],
  [t("4.944,00 kWh"), t("{totalConsumo}")],
  // observação (run com xml:space preserve e espaço inicial)
  [
    '<w:t xml:space="preserve"> Para o pleno funcionamento e atingimento da geração de energia estimada, é necessário que o telhado possua uma área útil mínima de 38,88 m² com orientação voltada para o Norte. Caso essas condições estruturais e de orientação não sejam integralmente atendidas, a geração real de energia poderá divergir dos valores previstos na simulação.</w:t>',
    '<w:t xml:space="preserve"> {textoObservacao}</w:t>',
  ],
  // investimento (faturamento 2 partes)
  [
    t("Pagamento Direto ao Distribuidor — WEG Equipamentos Elétricos S.A"),
    t("Pagamento Direto ao Distribuidor — {distribuidorNome}"),
  ],
  [
    t("CNPJ: 07.175.725/0001-60 — Referente ao Kit completo: módulos, inversor, estrutura e cabos."),
    t("CNPJ: {distribuidorCnpj} — Referente ao Kit completo: {kitItens}."),
  ],
  [t("R$ 10.888,67"), t("{valorKit}")],
  [t("R$ 7.622,07"), t("{valorGta}")],
  [t("R$ 18.510,74"), t("{valorTotal}")],
  [t("Dezoito mil, quinhentos e dez reais e setenta e quatro centavos."), t("{valorTotalExtenso}")],
  // prazo (substitui o trecho dentro da frase completa)
  [
    t(
      "O prazo de execução do projeto é de 45 a 60 dias, a depender do prazo de fornecimento dos materiais e equipamentos, contados a partir da aprovação da proposta até a entrega do sistema comissionado.",
    ),
    t(
      "O prazo de execução do projeto é de {prazoExecucao}, a depender do prazo de fornecimento dos materiais e equipamentos, contados a partir da aprovação da proposta até a entrega do sistema comissionado.",
    ),
  ],
  // garantia
  [
    t(
      "A fabricante WEG concede garantia de 1 (um) ano contra defeitos de fabricação para seus sistemas inversores, e a fabricante LONGi concede garantia de fábrica para os módulos fotovoltaicos. Eventuais garantias adicionais oferecidas por fabricantes de componentes avulsos que compõem nossos geradores (painéis, cabos, inversores, conectores, baterias, estruturas de fixação etc.) são de responsabilidade exclusiva desses fabricantes.",
    ),
    t("{textoGarantia}"),
  ],
  // condições gerais (menção ao distribuidor)
  [
    t("O pagamento referente ao Kit Fotovoltaico é realizado diretamente à WEG Equipamentos Elétricos S.A, conforme item 6.1;"),
    t("O pagamento referente ao Kit Fotovoltaico é realizado diretamente ao distribuidor {distribuidorNomeCurto}, conforme item 6.1;"),
  ],
  // aceite (nome do contratante)
  [t("MARIA SELMA"), t("{clienteNomeUpper}")],
];

for (const [search, replace, count] of R) {
  xml = sub(xml, search, replace, count ?? 1);
}

// aceite: a cidade que vem logo após o nome do contratante
{
  const anchor = xml.indexOf("{clienteNomeUpper}");
  const cityTag = t("Goiânia/GO");
  const at = xml.indexOf(cityTag, anchor);
  if (at < 0) throw new Error("Não achei a cidade do aceite após {clienteNomeUpper}");
  xml = xml.slice(0, at) + t("{cidadeUf}") + xml.slice(at + cityTag.length);
}

// ----- grava document.xml e remove lixo -----------------------------------

zip.file("word/document.xml", xml);

const KEEP_TOP = new Set(["word", "docProps", "_rels", "[Content_Types].xml", "customXml"]);
const removed = [];
for (const name of Object.keys(zip.files)) {
  const top = name.split("/")[0];
  if (!KEEP_TOP.has(top)) {
    delete zip.files[name];
    removed.push(name);
  }
}

fs.mkdirSync(path.dirname(OUT), { recursive: true });
const out = zip.generate({ type: "nodebuffer", compression: "DEFLATE" });
fs.writeFileSync(OUT, out);

console.log("Molde gerado:", OUT);
console.log("Arquivos-lixo removidos:", removed.length ? removed.join(", ") : "(nenhum)");

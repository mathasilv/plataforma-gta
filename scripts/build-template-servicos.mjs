/**
 * Constrói o molde padrão de proposta dos serviços CPQ
 * (src/services/_shared/template-servicos.docx) a partir de uma proposta REAL
 * da GTA: preserva papel timbrado (header/logo), fontes, margens e estilos, e
 * substitui o corpo por marcadores docxtemplater:
 *
 *   {tituloProposta} {clienteNome} {localAtividade} {referencia} {dataEmissao}
 *   {validade} {objeto} {#itens}{num}/{descricao}/{valor}/{condicao}{/itens}
 *   {valorTotal} {valorTotalExtenso} {#observacoes}{texto}{/observacoes}
 *   {formaPagamento} {prazoExecucao} {clienteNomeUpper} {cidadeUf}
 *
 * Uso único (a saída é versionada):  node scripts/build-template-servicos.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const PizZip = require("pizzip");

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BASE =
  "C:/Users/teteu/OneDrive/Documentos/OneDrive - GTA/OneDrive/Contratos e Orçamentos/01.26 - Ecosol - Subestação/Proposta Atualiza (Após Reunião com Cliente)/Proposta_GTA_Ecosol_Comissionamento_Subestacao.docx";
const OUT = path.join(ROOT, "src", "services", "_shared", "template-servicos.docx");

const NAVY = "1A2F4A";
const ORANGE = "F26522";
const INDIGO = "5B4FCF";

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** parágrafo simples */
const p = (text, opts = {}) => {
  const { bold, color, size, before = 60, after = 60, shd, italic } = opts;
  const rpr =
    "<w:rPr>" +
    (bold ? "<w:b/><w:bCs/>" : "") +
    (italic ? "<w:i/><w:iCs/>" : "") +
    (color ? `<w:color w:val="${color}"/>` : "") +
    (size ? `<w:sz w:val="${size}"/><w:szCs w:val="${size}"/>` : "") +
    "</w:rPr>";
  const ppr =
    "<w:pPr>" +
    (shd ? `<w:shd w:val="clear" w:color="auto" w:fill="${shd}"/>` : "") +
    `<w:spacing w:before="${before}" w:after="${after}"/><w:jc w:val="both"/>` +
    "</w:pPr>";
  return `<w:p>${ppr}<w:r>${rpr}<w:t xml:space="preserve">${esc(text)}</w:t></w:r></w:p>`;
};

/** parágrafo com múltiplos runs [texto, opts] */
const pRuns = (runs, popts = {}) => {
  const { before = 60, after = 60, shd } = popts;
  const body = runs
    .map(([text, o = {}]) => {
      const rpr =
        "<w:rPr>" +
        (o.bold ? "<w:b/><w:bCs/>" : "") +
        (o.color ? `<w:color w:val="${o.color}"/>` : "") +
        (o.size ? `<w:sz w:val="${o.size}"/><w:szCs w:val="${o.size}"/>` : "") +
        "</w:rPr>";
      return `<w:r>${rpr}<w:t xml:space="preserve">${esc(text)}</w:t></w:r>`;
    })
    .join("");
  const ppr =
    "<w:pPr>" +
    (shd ? `<w:shd w:val="clear" w:color="auto" w:fill="${shd}"/>` : "") +
    `<w:spacing w:before="${before}" w:after="${after}"/><w:jc w:val="both"/>` +
    "</w:pPr>";
  return `<w:p>${ppr}${body}</w:p>`;
};

/** faixa de seção no padrão GTA (laranja + risco índigo) */
const secao = (titulo) =>
  p(`  ${titulo}`, { bold: true, color: "FFFFFF", size: 24, shd: ORANGE, before: 240, after: 0 }) +
  `<w:p><w:pPr><w:shd w:val="clear" w:color="auto" w:fill="${INDIGO}"/><w:spacing w:before="0" w:after="120"/></w:pPr><w:r><w:rPr><w:color w:val="${INDIGO}"/><w:sz w:val="4"/><w:szCs w:val="4"/></w:rPr><w:t xml:space="preserve"> </w:t></w:r></w:p>`;

const corpo = [
  // título
  p("{tituloProposta}", { bold: true, color: NAVY, size: 30, before: 120, after: 40 }),
  p("{referencia}", { color: INDIGO, size: 18, before: 0, after: 160 }),

  secao("1   IDENTIFICAÇÃO"),
  pRuns([["Cliente: ", { bold: true }], ["{clienteNome}", {}]]),
  pRuns([["Local: ", { bold: true }], ["{localAtividade}", {}]]),
  pRuns([["Data de emissão: ", { bold: true }], ["{dataEmissao}", {}]]),
  pRuns([["Validade da proposta: ", { bold: true }], ["{validade}", {}]]),

  secao("2   OBJETO"),
  p("{objeto}"),

  secao("3   ESCOPO DOS SERVIÇOS E INVESTIMENTO"),
  p("{#itens}", { before: 0, after: 0 }),
  pRuns([["{num}. ", { bold: true, color: NAVY }], ["{descricao}", {}]], { before: 120, after: 20 }),
  pRuns(
    [["Valor: ", { bold: true }], ["{valor}", {}], ["{#condicao} — Condição de pagamento: {condicao}{/condicao}", {}]],
    { before: 0, after: 40 },
  ),
  p("{/itens}", { before: 0, after: 0 }),
  pRuns(
    [["  VALOR TOTAL DO ORÇAMENTO: ", { bold: true, color: "FFFFFF", size: 26 }], ["{valorTotal}", { bold: true, color: "FFFFFF", size: 26 }]],
    { shd: "1B7A3E", before: 160, after: 60 },
  ),
  pRuns([["  Valor total por extenso: ", { bold: true, color: INDIGO, size: 18 }], ["{valorTotalExtenso}", { size: 18 }]], { shd: "EDEAFC", before: 0, after: 60 }),

  secao("4   CONDIÇÕES GERAIS"),
  p("{#observacoes}", { before: 0, after: 0 }),
  p("•  {texto}", { before: 20, after: 20 }),
  p("{/observacoes}", { before: 0, after: 0 }),
  pRuns([["Forma de pagamento: ", { bold: true }], ["{formaPagamento}", {}]]),
  pRuns([["Prazo de execução: ", { bold: true }], ["{prazoExecucao}", {}]]),

  secao("5   DADOS DA CONTRATADA"),
  p("GTA ENERGIA LTDA — CNPJ: 59.214.861/0001-15", { bold: true }),
  p("E-mail: contato@gtaenergia.com  ·  Telefone/WhatsApp: (62) 9.9235-9517"),

  secao("6   ACEITE DO CLIENTE"),
  p("Declaro que li e aceito os termos desta proposta.", { after: 200 }),
  p("Assinatura: ________________________________________  Data: ____/____/______", { before: 200, after: 40 }),
  p("{clienteNomeUpper} — {cidadeUf}", { bold: true, before: 0 }),
].join("");

const zip = new PizZip(fs.readFileSync(BASE));
const xml = zip.file("word/document.xml").asText();

// preserva atributos do <w:document>, e o <w:sectPr> (margens + header/footer)
const sect = xml.match(/<w:sectPr[\s\S]*?<\/w:sectPr>/);
if (!sect) throw new Error("sectPr não encontrado no documento-base.");
const docOpen = xml.match(/<w:document[^>]*>/);
if (!docOpen) throw new Error("Tag w:document não encontrada.");

const novo =
  xml.slice(0, xml.indexOf(docOpen[0]) + docOpen[0].length) +
  "<w:body>" +
  corpo +
  sect[0] +
  "</w:body></w:document>";

zip.file("word/document.xml", novo);
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, zip.generate({ type: "nodebuffer", compression: "DEFLATE" }));
console.log("OK ->", OUT);

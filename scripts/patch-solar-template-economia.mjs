/**
 * Insere no molde do Solar (template.docx) o bloco condicional de economia e
 * payback, logo após o parágrafo "Valor total por extenso" da seção de
 * investimento. Usa marcadores docxtemplater:
 *
 *   {#temEconomia} ... {economiaMensal} {economiaAno1} {paybackTexto} ... {/temEconomia}
 *
 * Com `paragraphLoop: true` (ver src/lib/docx/generate.ts), o bloco some por
 * completo quando a proposta não tem economia calculada. Idempotente: não
 * duplica se o marcador já existir.
 *
 *   node scripts/patch-solar-template-economia.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const PizZip = require("pizzip");

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TPL = path.join(ROOT, "src", "services", "solar", "template.docx");

const zip = new PizZip(fs.readFileSync(TPL));
const xml = zip.file("word/document.xml").asText();

if (xml.includes("{#temEconomia}")) {
  console.log("Bloco de economia já presente — nada a fazer.");
  process.exit(0);
}

// Âncora: fim do parágrafo que contém {valorTotalExtenso}
const idx = xml.indexOf("{valorTotalExtenso}");
if (idx < 0) throw new Error("Âncora {valorTotalExtenso} não encontrada no molde.");
const fimPar = xml.indexOf("</w:p>", idx);
if (fimPar < 0) throw new Error("Fechamento do parágrafo âncora não encontrado.");
const insercao = fimPar + "</w:p>".length;

// Caixa verde no mesmo estilo da caixa "Valor total por extenso"
const BLOCO =
  `<w:p><w:r><w:t>{#temEconomia}</w:t></w:r></w:p>` +
  `<w:p><w:pPr><w:shd w:val="clear" w:color="auto" w:fill="E6F4EA"/><w:spacing w:before="60" w:after="60"/><w:ind w:left="120" w:right="120"/></w:pPr>` +
  `<w:r><w:rPr><w:b/><w:bCs/><w:color w:val="1B7A3E"/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr><w:t xml:space="preserve">  Economia estimada: </w:t></w:r>` +
  `<w:r><w:rPr><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr><w:t xml:space="preserve">{economiaMensal} por mês — {economiaAno1} no 1º ano</w:t></w:r>` +
  `<w:r><w:rPr><w:b/><w:bCs/><w:color w:val="1B7A3E"/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr><w:t xml:space="preserve">   ·   Payback estimado: </w:t></w:r>` +
  `<w:r><w:rPr><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr><w:t>{paybackTexto}</w:t></w:r>` +
  `</w:p>` +
  `<w:p><w:r><w:t>{/temEconomia}</w:t></w:r></w:p>`;

const novo = xml.slice(0, insercao) + BLOCO + xml.slice(insercao);
zip.file("word/document.xml", novo);
fs.writeFileSync(TPL, zip.generate({ type: "nodebuffer", compression: "DEFLATE" }));
console.log("OK: bloco de economia/payback inserido em", TPL);

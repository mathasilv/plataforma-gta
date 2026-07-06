/**
 * Helpers para construir moldes .docx a partir de propostas reais.
 *
 * O motor opera no nível do TEXTO (não do XML cru): ele varre os runs (<w:r>)
 * do documento, monta o texto corrido e substitui trechos mesmo quando o Word
 * fragmentou o texto em vários runs — mantendo a formatação do primeiro run.
 * Todas as substituições exigem contagem exata (falha alto se não bater).
 */
import fs from "node:fs";
import path from "node:path";
import PizZip from "pizzip";

// ----- entidades XML --------------------------------------------------------
const DEC = { "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'", "&apos;": "'" };
const decodeEnt = (s) => s.replace(/&(?:amp|lt|gt|quot|#39|apos);/g, (m) => DEC[m]);
const encodeEnt = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// ----- varredura de runs ----------------------------------------------------
/**
 * Divide o fragmento em "chunks": runs com texto (posição crua, rPr, texto
 * decodificado) e separadores (limites de parágrafo/runs sem texto), que
 * impedem que uma busca atravesse estruturas.
 */
// Separador impossível de aparecer em texto real (impede busca atravessar estruturas)
const SEP = String.fromCharCode(0);

function scanChunks(fragment) {
  const runRe = /<w:r(?:\s[^>]*)?>[\s\S]*?<\/w:r>/g;
  const chunks = [];
  let m;
  let lastEnd = 0;
  while ((m = runRe.exec(fragment))) {
    const raw = m[0];
    if (chunks.length) {
      const gap = fragment.slice(lastEnd, m.index);
      if (gap.includes("</w:p>")) chunks.push({ sep: true, text: SEP });
    }
    let text = "";
    let hasT = false;
    const tRe = /<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g;
    let tm;
    while ((tm = tRe.exec(raw))) {
      text += decodeEnt(tm[1]);
      hasT = true;
    }
    if (!hasT) {
      chunks.push({ sep: true, text: SEP });
    } else {
      const rpr = raw.match(/<w:rPr>[\s\S]*?<\/w:rPr>/)?.[0] ?? "";
      const open = raw.match(/^<w:r(?:\s[^>]*)?>/)[0];
      chunks.push({ start: m.index, end: m.index + raw.length, text, rpr, open });
    }
    lastEnd = m.index + raw.length;
  }
  return chunks;
}

function combinedOf(chunks) {
  const offsets = [];
  let acc = 0;
  for (const c of chunks) {
    offsets.push(acc);
    acc += c.text.length;
  }
  return { combined: chunks.map((c) => c.text).join(""), offsets };
}

/**
 * Substitui `needle` (texto puro) por `replacement` (texto puro, pode conter
 * marcadores {x}), exigindo exatamente `count` ocorrências no fragmento.
 * Funde runs fragmentados; preserva a formatação do primeiro run atingido.
 */
export function sub(fragment, needle, replacement, count = 1) {
  const chunks = scanChunks(fragment);
  const { combined, offsets } = combinedOf(chunks);

  const matches = [];
  let pos = 0;
  for (;;) {
    const i = combined.indexOf(needle, pos);
    if (i < 0) break;
    matches.push(i);
    pos = i + needle.length;
  }
  if (matches.length !== count) {
    throw new Error(
      `Esperava ${count} ocorrência(s) de:\n  «${needle.slice(0, 110)}»\nmas encontrou ${matches.length}.`,
    );
  }

  let out = fragment;
  const mk = (open, rpr, text) =>
    text.length ? `${open}${rpr}<w:t xml:space="preserve">${encodeEnt(text)}</w:t></w:r>` : "";

  for (let k = matches.length - 1; k >= 0; k--) {
    const mStart = matches[k];
    const mEnd = mStart + needle.length;
    let iChunk = -1;
    let jChunk = -1;
    for (let ci = 0; ci < chunks.length; ci++) {
      const cs = offsets[ci];
      const ce = cs + chunks[ci].text.length;
      if (iChunk < 0 && mStart >= cs && mStart < ce) iChunk = ci;
      if (mEnd > cs && mEnd <= ce) jChunk = ci;
    }
    if (iChunk < 0 || jChunk < 0) throw new Error(`Não mapeou chunks para: «${needle.slice(0, 80)}»`);
    for (let ci = iChunk; ci <= jChunk; ci++) {
      if (chunks[ci].sep) throw new Error(`Trecho cruza limite de parágrafo: «${needle.slice(0, 80)}»`);
    }
    const first = chunks[iChunk];
    const last = chunks[jChunk];
    const prefix = combined.slice(offsets[iChunk], mStart);
    const suffix = combined.slice(mEnd, offsets[jChunk] + last.text.length);

    if (iChunk === jChunk) {
      out = out.slice(0, first.start) + mk(first.open, first.rpr, prefix + replacement + suffix) + out.slice(first.end);
    } else {
      out = out.slice(0, last.start) + mk(last.open, last.rpr, suffix) + out.slice(last.end);
      for (let ci = jChunk - 1; ci > iChunk; ci--) {
        out = out.slice(0, chunks[ci].start) + out.slice(chunks[ci].end);
      }
      out = out.slice(0, first.start) + mk(first.open, first.rpr, prefix + replacement) + out.slice(first.end);
    }
  }
  return out;
}

/** Posição crua (no XML) do run onde `needle` (texto puro) começa. */
function findRunStart(fragment, needle) {
  const chunks = scanChunks(fragment);
  const { combined, offsets } = combinedOf(chunks);
  const i = combined.indexOf(needle);
  if (i < 0) throw new Error(`Texto não encontrado: «${needle.slice(0, 80)}»`);
  for (let ci = 0; ci < chunks.length; ci++) {
    const cs = offsets[ci];
    if (i >= cs && i < cs + chunks[ci].text.length) return chunks[ci].start;
  }
  throw new Error(`Não mapeou run para: «${needle.slice(0, 80)}»`);
}

/** {start,end,text} do <w:tr>...</w:tr> que contém `needle` (texto puro). */
export function rowAround(fragment, needle) {
  const idx = findRunStart(fragment, needle);
  const start = fragment.lastIndexOf("<w:tr", idx);
  const endTag = "</w:tr>";
  const end = fragment.indexOf(endTag, idx) + endTag.length;
  if (start < 0 || end < endTag.length) throw new Error(`Linha não delimitada: «${needle.slice(0, 80)}»`);
  return { start, end, text: fragment.slice(start, end) };
}

/** {start,end,text} do <w:p>...</w:p> que contém `needle` (texto puro). */
export function paraAround(fragment, needle) {
  const idx = findRunStart(fragment, needle);
  const start = Math.max(fragment.lastIndexOf("<w:p ", idx), fragment.lastIndexOf("<w:p>", idx));
  const endTag = "</w:p>";
  const end = fragment.indexOf(endTag, idx) + endTag.length;
  if (start < 0 || end < endTag.length) throw new Error(`Parágrafo não delimitado: «${needle.slice(0, 80)}»`);
  return { start, end, text: fragment.slice(start, end) };
}

/** Aplica substituições apenas dentro da linha de tabela que contém `anchorNeedle`. */
export function subInRow(xml, anchorNeedle, subs) {
  const row = rowAround(xml, anchorNeedle);
  let t = row.text;
  for (const [s, r, c] of subs) t = sub(t, s, r, c ?? 1);
  return xml.slice(0, row.start) + t + xml.slice(row.end);
}

/**
 * Colapsa as LINHAS de tabela entre a que contém `firstNeedle` e a que contém
 * `lastNeedle` em uma única linha-molde. `rowSubs`: [[busca, troca, count?]].
 */
export function collapseRows(xml, firstNeedle, lastNeedle, rowSubs) {
  const first = rowAround(xml, firstNeedle);
  const last = rowAround(xml, lastNeedle);
  let row = first.text;
  for (const [s, r, c] of rowSubs) row = sub(row, s, r, c ?? 1);
  return xml.slice(0, first.start) + row + xml.slice(last.end);
}

/**
 * Colapsa PARÁGRAFOS (bullets) entre dois textos em um bloco de loop:
 * parágrafo só com {#loop} + parágrafo-molde (bullet original com {campo}) +
 * parágrafo só com {/loop}. Com paragraphLoop, o docxtemplater remove os
 * parágrafos das tags e repete o parágrafo-molde por item.
 */
export function collapseParas(xml, firstNeedle, lastNeedle, innerSubs, loopName) {
  const first = paraAround(xml, firstNeedle);
  const last = paraAround(xml, lastNeedle);
  let p = first.text;
  for (const [s, r, c] of innerSubs) p = sub(p, s, r, c ?? 1);
  const open = `<w:p><w:r><w:t>{#${loopName}}</w:t></w:r></w:p>`;
  const close = `<w:p><w:r><w:t>{/${loopName}}</w:t></w:r></w:p>`;
  return xml.slice(0, first.start) + open + p + close + xml.slice(last.end);
}

const KEEP_TOP = new Set(["word", "docProps", "_rels", "[Content_Types].xml", "customXml"]);

export function loadDocx(sourcePath) {
  const zip = new PizZip(fs.readFileSync(sourcePath));
  return { zip, xml: zip.file("word/document.xml").asText() };
}

export function saveDocx(zip, xml, outPath) {
  zip.file("word/document.xml", xml);
  const removed = [];
  for (const name of Object.keys(zip.files)) {
    const top = name.split("/")[0];
    if (!KEEP_TOP.has(top)) {
      delete zip.files[name];
      removed.push(name);
    }
  }
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, zip.generate({ type: "nodebuffer", compression: "DEFLATE" }));
  console.log("Molde gerado:", outPath);
  if (removed.length) console.log("Removidos do zip:", removed.join(", "));
}

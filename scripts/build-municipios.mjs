/**
 * Gera src/services/solar/data/municipios.json a partir das bases embutidas na
 * planilha de Orçamento Solar da GTA (DB_MUNICIPIO + DB_IRRADIAÇÃO), pré-juntando
 * por município para uma tabela compacta: { nome, uf, hsp: [12 meses] }.
 *
 * Ferramenta de uso único (a saída municipios.json já está versionada). O pacote
 * `xlsx` NÃO faz parte das dependências do projeto para manter o build da Vercel
 * livre de fontes externas. Para regenerar, instale-o pontualmente:
 *
 *   npm i -D https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz
 *   node scripts/build-municipios.mjs
 *
 * hsp = irradiação diária média por mês (kWh/m²·dia), = valor da base / 1000.
 * A geração usa: geração_mês(kWh) = hsp_mês × kWpTotal × eficiência × dias_no_mês.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const XLSX = require("xlsx");

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE =
  "C:/Users/teteu/OneDrive/Documentos/OneDrive - GTA/OneDrive/Contratos e Orçamentos/05.26 - Pedro Igor Melo Jacinto (Indicação Lucas)/Orçamento Solar Pedro Igor.xlsx";
const OUT = path.join(ROOT, "src", "services", "solar", "data", "municipios.json");

const MESES = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEZ"];

const wb = XLSX.readFile(SOURCE, { cellFormula: false });
const sheet = (prefixo) => {
  const nome = wb.SheetNames.find((n) => n.toUpperCase().startsWith(prefixo));
  if (!nome) throw new Error(`Aba não encontrada: ${prefixo}`);
  return XLSX.utils.sheet_to_json(wb.Sheets[nome], { defval: null });
};

// Irradiação: Chave -> [12 meses] (valores divididos por 1000 = kWh/m²·dia)
const irr = new Map();
for (const r of sheet("DB_IRRAD")) {
  const chave = r["Chave"];
  if (!chave) continue;
  irr.set(chave, MESES.map((m) => Math.round((Number(r[m]) / 1000) * 1000) / 1000));
}

// Municípios: junta com a irradiação pela Chave (round lat|long)
const municipios = [];
let semIrr = 0;
for (const r of sheet("DB_MUNICIPIO")) {
  const nome = r["Mun/UF"];
  const uf = r["UF"];
  const chave = r["Chave"];
  if (!nome || !chave) continue;
  const hsp = irr.get(chave);
  if (!hsp) {
    semIrr++;
    continue;
  }
  municipios.push({ nome: String(nome).trim(), uf: String(uf ?? "").trim(), hsp });
}

// dedup por nome e ordena
const vistos = new Set();
const finais = municipios
  .filter((m) => (vistos.has(m.nome) ? false : (vistos.add(m.nome), true)))
  .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(finais), "utf8");

const kb = Math.round(fs.statSync(OUT).size / 1024);
console.log(`Gerado: ${OUT} (${finais.length} municípios, ${kb} KB)`);
if (semIrr) console.log(`Aviso: ${semIrr} municípios sem irradiação correspondente (ignorados).`);

// Amostra: Goiânia (JAN deve ser ~5,484)
const goi = finais.find((m) => m.nome.startsWith("GOIANIA"));
if (goi) console.log("GOIÂNIA HSP:", goi.hsp.map((h, i) => `${MESES[i]}:${h}`).join(" "));

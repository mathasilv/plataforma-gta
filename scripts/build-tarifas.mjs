/**
 * Gera src/services/solar/data/tarifas.json a partir da aba DB_Tarifas da
 * planilha de Orçamento Solar da GTA. Estrutura: por distribuidora e subgrupo
 * (B1/B2/B3), os componentes TE_ENERGIA e TUSD_FioB convertidos para R$/kWh.
 *
 * Ferramenta de uso único (a saída já está versionada). O pacote `xlsx` NÃO faz
 * parte das dependências do projeto — instale-o pontualmente para regenerar:
 *
 *   npm i -D https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz
 *   node scripts/build-tarifas.mjs
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
const OUT = path.join(ROOT, "src", "services", "solar", "data", "tarifas.json");

const wb = XLSX.readFile(SOURCE, { cellFormula: false });
const rows = XLSX.utils.sheet_to_json(wb.Sheets["DB_Tarifas"], { defval: null });

const mapa = {};
for (const r of rows) {
  const sigla = r["Sigla"];
  const sub = r["Subgrupo"];
  const comp = r["Componente Tarifária"];
  const valor = Number(r["Valor"]); // R$/MWh
  if (!sigla || !sub || !Number.isFinite(valor)) continue;
  mapa[sigla] ??= {};
  mapa[sigla][sub] ??= {};
  const rkwh = Math.round((valor / 1000) * 1e6) / 1e6;
  if (comp === "TUSD_FioB") mapa[sigla][sub].fioB = rkwh;
  else if (comp === "TE_ENERGIA") mapa[sigla][sub].te = rkwh;
}

fs.writeFileSync(OUT, JSON.stringify(mapa, null, 0), "utf8");
console.log(`OK: ${Object.keys(mapa).length} distribuidoras -> ${OUT}`);

/**
 * Teste end-to-end da API rodando (login -> /api/gerar -> diff de texto).
 *   node scripts/test-api.mjs
 * Requer `npm run dev` ativo em http://localhost:3000
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import PizZip from "pizzip";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const BASE = "http://localhost:3000";
const OUT = path.join(ROOT, "scripts", "_out_api.docx");
const ORIGINAL =
  "C:/Users/teteu/OneDrive/Documentos/OneDrive - GTA/OneDrive/Contratos e Orçamentos/06.26 - Orçamento Solar - Maria Selma - Goiânia/PROPOSTA_COMERCIAL_-_MARIA_SELMA_WEG.docx";

const MESES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const insol = ["5,484","5,525","5,175","5,044","4,787","4,587","4,760","5,681","5,564","5,596","5,396","5,499"];
const energ = ["963,92","877,15","909,61","857,98","841,41","780,25","836,67","998,55","946,44","983,61","917,86","966,56"];
const cons = Array(12).fill("412,00");

const formData = {
  clienteNome: "Maria Selma",
  cidadeUf: "Goiânia/GO",
  objeto: "Implantação de Sistema de Microgeração Solar Fotovoltaica On-Grid",
  subtitulo: "SISTEMA FOTOVOLTAICO CONECTADO À REDE  ·  MICROGERAÇÃO SOLAR ON-GRID",
  referenciaSeq: 3,
  dataEmissao: "2026-07-01",
  validadeDias: 20,
  formaPagamento: "A combinar",
  textoObjetivo:
    "A presente proposta tem como objetivo a implantação de um sistema de microgeração de energia solar fotovoltaica conectada à rede elétrica (On-Grid) na residência da Sra. Maria Selma, em Goiânia/GO, proporcionando redução nos custos com energia elétrica através da geração própria de energia limpa e renovável.",
  potenciaPainel: "630 W",
  qtdPaineis: "12 unidades",
  potenciaTotal: "7,56 kWp",
  potenciaInversor: "6 kWp",
  overload: "26,00%",
  qtdInversores: "1 unidade",
  tipoInversor: "inversor",
  simulacao: MESES.map((mes, i) => ({ mes, insolacao: insol[i], energia: energ[i], consumo: cons[i] })),
  textoObservacao:
    "Para o pleno funcionamento e atingimento da geração de energia estimada, é necessário que o telhado possua uma área útil mínima de 38,88 m² com orientação voltada para o Norte. Caso essas condições estruturais e de orientação não sejam integralmente atendidas, a geração real de energia poderá divergir dos valores previstos na simulação.",
  materiais: [
    { qtde: "12", descricao: "MÓDULO - CÉLULA N-TYPE BC 630 WP - LONGI" },
    { qtde: "1", descricao: "INVERSOR MONOFÁSICO 220 V SIW300H M060 W00 - WEG" },
    { qtde: "2", descricao: "PROTETOR SURTO CA SPW02-275-20" },
    { qtde: "3", descricao: "CONECTOR MC4 6 MM²" },
    { qtde: "50", descricao: "CABO CC UNIPOLAR FLEXÍVEL NH 6 MM² PRETO" },
    { qtde: "50", descricao: "CABO CC UNIPOLAR FLEXÍVEL NH 6 MM² VERMELHO" },
    { qtde: "1", descricao: "DISJUNTOR CA MDWP-C50-2" },
    { qtde: "3", descricao: "ESTRUTURA PARA TELHADO METÁLICO 4 MÓDULOS EM RETRATO (PERFIL 55CM)" },
  ],
  distribuidor: "weg",
  distribuidorNome: "",
  distribuidorCnpj: "",
  kitItens: "módulos, inversor, estrutura e cabos",
  valorKit: "10.888,67",
  valorGta: "7.622,07",
  prazoExecucao: "45 a 60 dias",
};

const login = await fetch(`${BASE}/api/login`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email: "admin@gta.com", password: "gta123" }),
});
console.log("login:", login.status);
const cookie = login.headers.get("set-cookie")?.split(";")[0] ?? "";

const gen = await fetch(`${BASE}/api/gerar`, {
  method: "POST",
  headers: { "Content-Type": "application/json", Cookie: cookie },
  body: JSON.stringify({ serviceKey: "solar", formData }),
});
console.log("gerar:", gen.status, gen.headers.get("content-type"));
if (!gen.ok) {
  console.log(await gen.text());
  process.exit(1);
}
const buf = Buffer.from(await gen.arrayBuffer());
fs.writeFileSync(OUT, buf);
console.log("salvo:", OUT, buf.length, "bytes");

// diff
const g = normalize(extractText(OUT));
const o = normalize(extractText(ORIGINAL));
const soO = o.filter((l) => !g.includes(l));
const soG = g.filter((l) => !o.includes(l));
console.log(`\nlinhas original ${o.length} | gerado ${g.length}`);
console.log(`\n- só no ORIGINAL (${soO.length}):`); soO.forEach((l) => console.log("  - " + l));
console.log(`\n+ só no GERADO (${soG.length}):`); soG.forEach((l) => console.log("  + " + l));
console.log(soO.length === 0 && soG.length === 0 ? "\n✅ idêntico" : "\n⚠️ diferenças (esperado: 1 linha do distribuidor normalizada)");

function extractText(file) {
  const z = new PizZip(fs.readFileSync(file));
  let xml = z.file("word/document.xml").asText();
  xml = xml.replace(/<\/w:p>/g, "\n").replace(/<w:tab[^>]*\/>/g, "\t").replace(/<[^>]+>/g, "");
  return xml.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'");
}
function normalize(t) { return t.split("\n").map((l) => l.trim()).filter(Boolean); }

/**
 * Verificação do molde Solar: gera o .docx com os dados reais da Maria Selma (WEG)
 * e compara o TEXTO extraído com o do documento original. Se baterem, os
 * marcadores, loops e o gráfico estão corretos.
 *
 *   node scripts/test-solar.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const TEMPLATE = path.join(ROOT, "src", "services", "solar", "template.docx");
const ORIGINAL =
  "C:/Users/teteu/OneDrive/Documentos/OneDrive - GTA/OneDrive/Contratos e Orçamentos/06.26 - Orçamento Solar - Maria Selma - Goiânia/PROPOSTA_COMERCIAL_-_MARIA_SELMA_WEG.docx";
const OUT = path.join(ROOT, "scripts", "_out_maria_selma.docx");

const MESES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const insol = ["5,484","5,525","5,175","5,044","4,787","4,587","4,760","5,681","5,564","5,596","5,396","5,499"];
const energ = ["963,92","877,15","909,61","857,98","841,41","780,25","836,67","998,55","946,44","983,61","917,86","966,56"];
const cons = Array(12).fill("412,00");

const data = {
  subtitulo: "SISTEMA FOTOVOLTAICO CONECTADO À REDE  ·  MICROGERAÇÃO SOLAR ON-GRID",
  clienteTitulo: "MARIA SELMA — GOIÂNIA/GO",
  clienteCidade: "Maria Selma — Goiânia/GO",
  objeto: "Implantação de Sistema de Microgeração Solar Fotovoltaica On-Grid",
  referencia: "GTA-2026-MARIASELMA-SOLAR-003",
  dataEmissao: "Goiânia, 01 de julho de 2026",
  validade: "21 de julho de 2026 (20 dias corridos)",
  formaPagamento: "A combinar",
  textoObjetivo:
    "A presente proposta tem como objetivo a implantação de um sistema de microgeração de energia solar fotovoltaica conectada à rede elétrica (On-Grid) na residência da Sra. Maria Selma, em Goiânia/GO, proporcionando redução nos custos com energia elétrica através da geração própria de energia limpa e renovável.",
  potenciaPainel: "630 W",
  qtdPaineis: "12 unidades",
  potenciaTotal: "7,56 kWp",
  potenciaInversor: "6 kWp",
  overload: "26,00%",
  qtdInversores: "1 unidade",
  labelPotInversor: "Potência do Inversor (kWp)",
  labelQtdInversores: "Quantidade de Inversores",
  simulacao: MESES.map((mes, i) => ({ mes, insolacao: insol[i], energia: energ[i], consumo: cons[i] })),
  totalEnergia: "10.880,01 kWh",
  totalConsumo: "4.944,00 kWh",
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
  distribuidorNome: "WEG Equipamentos Elétricos S.A",
  distribuidorNomeCurto: "WEG",
  distribuidorCnpj: "07.175.725/0001-60",
  kitItens: "módulos, inversor, estrutura e cabos",
  valorKit: "R$ 10.888,67",
  valorGta: "R$ 7.622,07",
  valorTotal: "R$ 18.510,74",
  valorTotalExtenso: "Dezoito mil, quinhentos e dez reais e setenta e quatro centavos.",
  textoGarantia:
    "A fabricante WEG concede garantia de 1 (um) ano contra defeitos de fabricação para seus sistemas inversores, e a fabricante LONGi concede garantia de fábrica para os módulos fotovoltaicos. Eventuais garantias adicionais oferecidas por fabricantes de componentes avulsos que compõem nossos geradores (painéis, cabos, inversores, conectores, baterias, estruturas de fixação etc.) são de responsabilidade exclusiva desses fabricantes.",
  prazoExecucao: "45 a 60 dias",
  clienteNomeUpper: "MARIA SELMA",
  cidadeUf: "Goiânia/GO",
};

// ---- gera ----
const zip = new PizZip(fs.readFileSync(TEMPLATE));
const doc = new Docxtemplater(zip, {
  paragraphLoop: true,
  linebreaks: true,
  delimiters: { start: "{", end: "}" },
  nullGetter: () => "",
});
doc.render(data);

// patch do gráfico (mesma lógica de src/lib/docx/patchChart.ts)
const rzip = doc.getZip();
patchChart(rzip, energ.map(toNum), cons.map(toNum));

fs.writeFileSync(OUT, rzip.generate({ type: "nodebuffer", compression: "DEFLATE" }));
console.log("Gerado:", OUT);

// ---- compara texto ----
const gerado = extractText(OUT);
const original = extractText(ORIGINAL);
const linesG = normalize(gerado);
const linesO = normalize(original);

const soNoOriginal = linesO.filter((l) => !linesG.includes(l));
const soNoGerado = linesG.filter((l) => !linesO.includes(l));

console.log(`\nLinhas originais: ${linesO.length} | geradas: ${linesG.length}`);
console.log(`\n=== Presente no ORIGINAL e ausente no GERADO (${soNoOriginal.length}) ===`);
soNoOriginal.forEach((l) => console.log("  - " + l));
console.log(`\n=== Presente no GERADO e ausente no ORIGINAL (${soNoGerado.length}) ===`);
soNoGerado.forEach((l) => console.log("  + " + l));

if (soNoOriginal.length === 0 && soNoGerado.length === 0) {
  console.log("\n✅ TEXTO IDÊNTICO — molde fiel ao original.");
} else {
  console.log("\n⚠️  Há diferenças (ver acima).");
}

// ---- helpers ----
function toNum(s) { return Number(String(s).replace(/\./g, "").replace(",", ".")); }

function patchChart(zip, geracao, consumo) {
  const f = zip.file("word/charts/chart1.xml");
  if (!f) { console.log("(sem gráfico)"); return; }
  let xml = f.asText();
  const caches = [geracao, consumo];
  let ci = 0;
  xml = xml.replace(/<c:numCache>[\s\S]*?<\/c:numCache>/g, (block) => {
    const vals = caches[ci++]; if (!vals) return block;
    let pi = 0;
    return block.replace(/<c:v>[\s\S]*?<\/c:v>/g, (pt) => {
      const v = vals[pi++]; return v == null || Number.isNaN(v) ? pt : `<c:v>${v.toFixed(2)}</c:v>`;
    });
  });
  zip.file("word/charts/chart1.xml", xml);
}

function extractText(file) {
  const z = new PizZip(fs.readFileSync(file));
  let xml = z.file("word/document.xml").asText();
  xml = xml.replace(/<\/w:p>/g, "\n").replace(/<w:tab[^>]*\/>/g, "\t").replace(/<[^>]+>/g, "");
  return xml.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'");
}

function normalize(text) {
  return text.split("\n").map((l) => l.trim()).filter((l) => l.length > 0);
}

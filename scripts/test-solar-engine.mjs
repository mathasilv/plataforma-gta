/**
 * Valida os motores Solar contra os números reais da planilha do Pedro Igor.
 *   node scripts/test-solar-engine.mjs
 * (Replica as fórmulas de sizing/generation/pricing e confere contra a planilha.)
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const municipios = JSON.parse(fs.readFileSync(path.join(ROOT, "src/services/solar/data/municipios.json"), "utf8"));

const goi = municipios.find((m) => m.nome.startsWith("GOIANIA"));
const hsp = goi.hsp;
const hspMedia = hsp.reduce((s, h) => s + h, 0) / 12;

// ---- entradas do Pedro Igor ----
const consumo = [1014, 1165, 1032, 1022, 947, 780, 766, 898, 1006, 1265, 1262, 1294];
const consumoMedio = consumo.reduce((s, c) => s + c, 0) / 12;
const disponibilidade = 100; // trifásico
const eficiencia = 0.75;
const overloadDesejado = 0.15;
const potenciaPainel = 700;

// ---- dimensionamento ----
const kwpNecessaria = ((consumoMedio - disponibilidade) / 30 / hspMedia / eficiencia) * 1.15;
const nPlacasSugerido = Math.ceil((kwpNecessaria * 1000) / potenciaPainel);
const inversorSugerido = kwpNecessaria / (1 + overloadDesejado);

// ---- config comercial ----
const nPaineis = 16;
const kwpTotal = (nPaineis * potenciaPainel) / 1000; // 11.2

// ---- geração (JAN) ----
const DIAS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const genJan = hsp[0] * kwpTotal * eficiencia * DIAS[0];

// ---- preço ----
const kit = 18400.27;
const fator = 1.5;
const valorTotal = kit * fator;
const servicos = valorTotal - kit;
const instalacao = 120 * nPaineis;
const materialCa = 0.2 * (kwpTotal * 1000);
const deslocamento = 188 * 2;
const imposto = servicos * 0.0701;
const comissao = servicos * 0.05;
const custoBase = 103 + 0 + deslocamento + instalacao + materialCa + 0 + imposto;
const lucro = servicos - custoBase;
const margem = lucro / servicos;

const check = (nome, got, esp, tol = 0.5) => {
  const ok = Math.abs(got - esp) <= tol;
  console.log(`${ok ? "✅" : "❌"} ${nome}: ${got.toFixed(2)}  (planilha: ${esp})`);
};

console.log("HSP média Goiânia:", hspMedia.toFixed(3), "(planilha 5.258)");
check("kWp necessária", kwpNecessaria, 9.1139, 0.01);
check("nº placas sugerido", nPlacasSugerido, 14, 0);
check("inversor sugerido (kW)", inversorSugerido, 7.9251, 0.01);
check("geração JAN (kWh)", genJan, 1428.03, 1);
check("Valor Total", valorTotal, 27600.41, 1);
check("Serviços GTA", servicos, 9200.13, 1);
check("Instalação", instalacao, 1920, 0);
check("Material CA", materialCa, 2240, 0);
check("Imposto (NF)", imposto, 644.93, 1);
check("Comissão", comissao, 460.01, 1);
check("Lucro", lucro, 3916.21, 1);
check("Margem", margem * 100, 42.57, 0.1);

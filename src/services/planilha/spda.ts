import ExcelJS from "exceljs";
import { Aba, novaPlanilha, cabecalho, num, BRL, PCT } from "./core";

/**
 * Planilha do Projeto de SPDA (ABNT NBR 5419) — modelo HÍBRIDO com fórmulas vivas:
 *   risco       = nº de blocos × valor por bloco           (por bloco)
 *   projeto     = área × preço por m²                       (por m²)
 *   faturamento = MAX(risco + projeto, piso mínimo)         (piso p/ jobs pequenos)
 *   impostos    = faturamento × NF
 *   lucro       = faturamento − impostos
 *   margem      = lucro / faturamento
 * Todas as entradas (nBlocos, valorPorBloco, área, preçoPorM2, piso, NF) são
 * editáveis no Excel e recalculam a cadeia.
 */
export function planilhaSpda(d: {
  cliente?: string;
  referencia?: string;
  nBlocos: number;
  valorPorBloco: number;
  area: number;
  precoPorM2: number;
  piso: number;
  aliqImpostos: number;
}): ExcelJS.Workbook {
  const wb = novaPlanilha();
  const a = new Aba(wb, "Precificação");
  cabecalho(a, "Projeto de SPDA (NBR 5419) — Precificação", { cliente: d.cliente, referencia: d.referencia });

  const nBlocos = Math.max(0, Math.floor(num(d.nBlocos)));
  const valorPorBloco = num(d.valorPorBloco);
  const area = Math.max(0, num(d.area));
  const precoPorM2 = num(d.precoPorM2);
  const piso = num(d.piso);
  const aliq = num(d.aliqImpostos);

  a.secao("Gerenciamento de risco — por bloco");
  const nBlocosRef = a.campo("Nº de blocos / estruturas", nBlocos, { fmt: '#,##0' });
  const vBlocoRef = a.campo("Valor por bloco (risco)", valorPorBloco, { fmt: BRL, nota: "editável" });
  const risco = valorPorBloco * nBlocos;
  const riscoRef = a.formula("Gerenciamento de risco", `${nBlocosRef}*${vBlocoRef}`, risco, { fmt: BRL, bold: true });
  a.espaco();

  a.secao("Projeto de SPDA — por m²");
  const areaRef = a.campo("Área de cobertura", area, { fmt: '#,##0.00 "m²"' });
  const m2Ref = a.campo("Preço por m²", precoPorM2, { fmt: BRL, nota: "editável" });
  const projeto = precoPorM2 * area;
  const projetoRef = a.formula("Projeto de SPDA", `${areaRef}*${m2Ref}`, projeto, { fmt: BRL, bold: true });
  a.espaco();

  a.secao("Faturamento e margem");
  const pisoRef = a.campo("Piso mínimo (risco + projeto)", piso, { fmt: BRL, nota: "protege jobs pequenos" });
  const faturamento = Math.max(risco + projeto, piso);
  const fatRef = a.formula("Faturamento (preço ao cliente)", `MAX(${riscoRef}+${projetoRef},${pisoRef})`, faturamento, { fmt: BRL, destaque: true });
  const nfRef = a.campo("Impostos / NF", aliq, { fmt: PCT });
  const impostos = faturamento * aliq;
  const impRef = a.formula("Impostos (R$)", `${fatRef}*${nfRef}`, impostos, { fmt: BRL });
  const lucro = faturamento - impostos;
  const lucroRef = a.formula("Lucro", `${fatRef}-${impRef}`, lucro, { fmt: BRL });
  a.formula("Margem líquida", `${lucroRef}/${fatRef}`, faturamento > 0 ? lucro / faturamento : 0, { fmt: PCT, destaque: true });

  return wb;
}

import ExcelJS from "exceljs";
import { Aba, novaPlanilha, BRL, PCT, NUM } from "./core";

/**
 * Builders de planilha por serviço. Cada um recebe os dados que o configurador
 * já calculou (números crus) e monta um .xlsx com FÓRMULAS de Excel — mudar uma
 * entrada (preço, Fator K, %) recalcula tudo. Registrados em BUILDERS.
 */

type Num = number;
const n = (v: unknown): Num => (typeof v === "number" && Number.isFinite(v) ? v : 0);

function cabecalho(a: Aba, titulo: string, d: { cliente?: string; referencia?: string; servico?: string }) {
  const sub = [d.cliente ? `Cliente: ${d.cliente}` : "", d.referencia ? `Ref.: ${d.referencia}` : ""].filter(Boolean).join("  ·  ");
  a.titulo(titulo, sub || undefined);
}

/** Bloco "custo × Fator K" reutilizado por Carregador/QGBT/Execução SE. */
function blocoFatorK(a: Aba, custoGeralRef: string, custoGeral: Num, fatorK: Num, aliq: Num) {
  const kRef = a.campo("Fator K (markup)", fatorK, { fmt: NUM, nota: "editável — recalcula abaixo" });
  const fat = custoGeral * fatorK;
  const fatRef = a.formula("Faturamento (preço ao cliente)", `${custoGeralRef}*${kRef}`, fat, { fmt: BRL, destaque: true });
  const impRef = a.campo("Impostos / NF", aliq, { fmt: PCT });
  const imp = fat * aliq;
  const impValRef = a.formula("Impostos (R$)", `${fatRef}*${impRef}`, imp, {});
  const lucro = fat - custoGeral - imp;
  const lucroRef = a.formula("Lucro", `${fatRef}-${custoGeralRef}-${impValRef}`, lucro, {});
  a.formula("Margem líquida", `${lucroRef}/${fatRef}`, fat > 0 ? lucro / fat : 0, { fmt: PCT, destaque: true });
}

/** Tabela de composição de custo (descrição, un, qtd, valor unit, total=qtd*unit). Retorna a ref da soma. */
function tabelaCusto(a: Aba, itens: { descricao: string; unidade?: string; qtd: number; precoUnit: number }[], labelSoma = "Custo total"): string {
  const dataStart = a.linhaAtual + 1;
  const linhas = itens.map((m, i) => {
    const rn = dataStart + i;
    return [m.descricao || "—", m.unidade || "un", n(m.qtd), n(m.precoUnit), { formula: `C${rn}*D${rn}`, result: n(m.qtd) * n(m.precoUnit) }];
  });
  const t = a.tabela(["Descrição", "Un.", "Qtd", "Valor unit.", "Total"], linhas, [undefined, undefined, NUM, BRL, BRL]);
  const soma = itens.reduce((s, m) => s + n(m.qtd) * n(m.precoUnit), 0);
  return a.formula(labelSoma, `SUM(E${t.primeira}:E${t.ultima})`, soma, { bold: true });
}

// ---------------------------------------------------------------- Carregador

export function planilhaCarregador(d: {
  cliente?: string; referencia?: string;
  sizing?: { potenciaKw?: number; tensao?: number; corrente?: number; disjuntor?: number; secaoCabo?: number; dr?: string };
  materiais: { descricao: string; unidade?: string; qtd: number; precoUnit: number }[];
  maoObraPorPonto: number; qtdPontos: number; fatorK: number; aliqImpostos: number;
}): ExcelJS.Workbook {
  const wb = novaPlanilha();
  const a = new Aba(wb, "Precificação");
  cabecalho(a, "Carregador Veicular (EV) — Precificação", { cliente: d.cliente, referencia: d.referencia });

  if (d.sizing) {
    a.secao("Dimensionamento (NBR 5410 / 17019)");
    if (d.sizing.potenciaKw) a.campo("Potência do carregador", d.sizing.potenciaKw, { fmt: '0.0 "kW"' });
    if (d.sizing.corrente) a.campo("Corrente de projeto (Ib)", d.sizing.corrente, { fmt: '0.0 "A"' });
    if (d.sizing.disjuntor) a.campo("Disjuntor", d.sizing.disjuntor, { fmt: '0 "A"' });
    if (d.sizing.secaoCabo) a.campo("Seção do cabo", d.sizing.secaoCabo, { fmt: '0.0 "mm²"' });
    if (d.sizing.dr) a.campo("Proteção diferencial", d.sizing.dr);
    a.espaco();
  }

  a.secao("Composição de custo — materiais");
  const custoMatRef = tabelaCusto(a, d.materiais, "Custo dos materiais");
  a.espaco();

  a.secao("Mão de obra e markup");
  const moUnitRef = a.campo("Mão de obra por ponto", n(d.maoObraPorPonto), { fmt: BRL });
  const qtdRef = a.campo("Nº de pontos", n(d.qtdPontos), { fmt: NUM });
  const mo = n(d.maoObraPorPonto) * n(d.qtdPontos);
  const moRef = a.formula("Mão de obra total", `${moUnitRef}*${qtdRef}`, mo, { fmt: BRL });
  const custoGeral = d.materiais.reduce((s, m) => s + n(m.qtd) * n(m.precoUnit), 0) + mo;
  const custoGeralRef = a.formula("Custo geral", `${custoMatRef}+${moRef}`, custoGeral, { fmt: BRL, bold: true });
  a.espaco();

  a.secao("Preço e margem");
  blocoFatorK(a, custoGeralRef, custoGeral, n(d.fatorK), n(d.aliqImpostos));
  return wb;
}

// ---------------------------------------------------------------- Genérica (fallback)

export function planilhaGenerica(d: { cliente?: string; referencia?: string; servico?: string; itens?: { descricao: string; valor: number }[]; total?: number }): ExcelJS.Workbook {
  const wb = novaPlanilha();
  const a = new Aba(wb, "Proposta");
  cabecalho(a, `${d.servico ?? "Serviço"} — Resumo`, { cliente: d.cliente, referencia: d.referencia });
  a.secao("Itens da proposta");
  const itens = d.itens ?? [];
  const dataStart = a.linhaAtual + 1;
  const linhas = itens.map((it) => [it.descricao || "—", "", "", "", n(it.valor)]);
  const t = a.tabela(["Descrição", "", "", "", "Valor"], linhas, [undefined, undefined, undefined, undefined, BRL]);
  void dataStart;
  a.formula("Total", itens.length ? `SUM(E${t.primeira}:E${t.ultima})` : "0", n(d.total), { fmt: BRL, destaque: true });
  return wb;
}

/** Registro key → builder. Serviços sem builder próprio caem no genérico. */
export const BUILDERS: Record<string, (d: Record<string, unknown>) => ExcelJS.Workbook> = {
  carregador: (d) => planilhaCarregador(d as Parameters<typeof planilhaCarregador>[0]),
};

export function construirPlanilha(serviceKey: string, data: Record<string, unknown>): ExcelJS.Workbook {
  const b = BUILDERS[serviceKey];
  return b ? b(data) : planilhaGenerica(data as Parameters<typeof planilhaGenerica>[0]);
}

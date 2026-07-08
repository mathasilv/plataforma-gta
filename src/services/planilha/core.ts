import ExcelJS from "exceljs";

/**
 * Helpers para montar planilhas .xlsx "vivas" (com fórmulas de Excel) no padrão
 * visual da GTA. Cada serviço tem um builder em ./builders que usa a classe Aba
 * para escrever seções, campos e fórmulas — o usuário pode abrir no Excel e
 * mudar entradas que tudo recalcula.
 */

export const BRL = 'R$ #,##0.00';
export const PCT = '0.0%';
export const NUM = '#,##0.00';

const NAVY = "FF1A2F4A";
const INDIGO = "FF5B4FCF";
const CINZA = "FFF1F5F9";
const CINZA_BORDA = "FFE2E8F0";

export function novaPlanilha(): ExcelJS.Workbook {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Plataforma GTA";
  wb.created = new Date(2026, 0, 1);
  return wb;
}

type Opts = { fmt?: string; bold?: boolean; destaque?: boolean; nota?: string };

/** Uma aba com escrita sequencial por linha e refs de célula para fórmulas. */
export class Aba {
  ws: ExcelJS.Worksheet;
  private r = 1;

  constructor(wb: ExcelJS.Workbook, nome: string) {
    this.ws = wb.addWorksheet(nome, { views: [{ showGridLines: false }], properties: { defaultColWidth: 14 } });
    this.ws.getColumn(1).width = 44;
    this.ws.getColumn(2).width = 16;
    this.ws.getColumn(3).width = 16;
    this.ws.getColumn(4).width = 18;
    this.ws.getColumn(5).width = 18;
  }

  /** Faixa de título (navy, texto branco) mesclada nas 5 colunas. */
  titulo(texto: string, sub?: string) {
    const c = this.ws.getCell(this.r, 1);
    c.value = texto;
    c.font = { bold: true, size: 14, color: { argb: "FFFFFFFF" } };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } };
    c.alignment = { vertical: "middle", indent: 1 };
    this.ws.getRow(this.r).height = 26;
    this.ws.mergeCells(this.r, 1, this.r, 5);
    this.r++;
    if (sub) {
      const s = this.ws.getCell(this.r, 1);
      s.value = sub;
      s.font = { size: 10, color: { argb: "FF64748B" }, italic: true };
      s.alignment = { indent: 1 };
      this.ws.mergeCells(this.r, 1, this.r, 5);
      this.r++;
    }
    this.r++;
  }

  /** Cabeçalho de seção (índigo). */
  secao(texto: string) {
    const c = this.ws.getCell(this.r, 1);
    c.value = texto.toUpperCase();
    c.font = { bold: true, size: 10, color: { argb: INDIGO } };
    this.ws.mergeCells(this.r, 1, this.r, 5);
    this.ws.getRow(this.r).height = 18;
    this.r++;
  }

  /** Linha label + valor (coluna B). Retorna o endereço da célula do valor (ex.: "B7"). */
  campo(label: string, valor: string | number | null, opts: Opts = {}): string {
    const lc = this.ws.getCell(this.r, 1);
    lc.value = label;
    lc.font = { size: 11, bold: !!opts.bold, color: { argb: opts.destaque ? NAVY : "FF334155" } };
    lc.alignment = { indent: 1 };
    const vc = this.ws.getCell(this.r, 2);
    vc.value = valor as ExcelJS.CellValue;
    vc.numFmt = opts.fmt ?? (typeof valor === "number" ? NUM : undefined) ?? "";
    vc.font = { size: 11, bold: !!opts.bold || !!opts.destaque, color: { argb: opts.destaque ? NAVY : "FF0F172A" } };
    if (opts.destaque) { lc.fill = vc.fill = { type: "pattern", pattern: "solid", fgColor: { argb: CINZA } }; }
    if (opts.nota) {
      const n = this.ws.getCell(this.r, 3);
      n.value = opts.nota; n.font = { size: 9, italic: true, color: { argb: "FF94A3B8" } };
      this.ws.mergeCells(this.r, 3, this.r, 5);
    }
    const ref = `B${this.r}`;
    this.r++;
    return ref;
  }

  /** Linha label + FÓRMULA (coluna B). `result` é o valor pré-calculado (fallback). */
  formula(label: string, formula: string, result: number, opts: Opts = {}): string {
    const lc = this.ws.getCell(this.r, 1);
    lc.value = label;
    lc.font = { size: 11, bold: !!opts.bold, color: { argb: opts.destaque ? NAVY : "FF334155" } };
    lc.alignment = { indent: 1 };
    const vc = this.ws.getCell(this.r, 2);
    vc.value = { formula, result } as ExcelJS.CellFormulaValue;
    vc.numFmt = opts.fmt ?? BRL;
    vc.font = { size: 11, bold: !!opts.bold || !!opts.destaque, color: { argb: opts.destaque ? NAVY : "FF0F172A" } };
    if (opts.destaque) { lc.fill = vc.fill = { type: "pattern", pattern: "solid", fgColor: { argb: CINZA } }; }
    if (opts.nota) {
      const n = this.ws.getCell(this.r, 3);
      n.value = opts.nota; n.font = { size: 9, italic: true, color: { argb: "FF94A3B8" } };
      this.ws.mergeCells(this.r, 3, this.r, 5);
    }
    const ref = `B${this.r}`;
    this.r++;
    return ref;
  }

  /**
   * Tabela com cabeçalho e linhas. Cada célula pode ser valor bruto ou
   * { formula, result }. Retorna o intervalo das linhas de dados por coluna,
   * ex.: colRange(colIndex) → "C4:C9" para SOMA.
   */
  tabela(headers: string[], linhas: (string | number | { formula: string; result: number })[][], fmts: (string | undefined)[] = []): { primeira: number; ultima: number; colLetra: (i: number) => string } {
    const hr = this.ws.getRow(this.r);
    headers.forEach((h, i) => {
      const c = hr.getCell(i + 1);
      c.value = h;
      c.font = { bold: true, size: 10, color: { argb: "FFFFFFFF" } };
      c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } };
      c.alignment = { vertical: "middle", indent: i === 0 ? 1 : 0, horizontal: i === 0 ? "left" : "right" };
    });
    hr.height = 20;
    this.r++;
    const primeira = this.r;
    for (const linha of linhas) {
      const row = this.ws.getRow(this.r);
      linha.forEach((cel, i) => {
        const c = row.getCell(i + 1);
        if (cel !== null && typeof cel === "object") c.value = { formula: cel.formula, result: cel.result } as ExcelJS.CellFormulaValue;
        else c.value = cel as ExcelJS.CellValue;
        if (fmts[i]) c.numFmt = fmts[i]!;
        c.font = { size: 10, color: { argb: "FF334155" } };
        c.alignment = { indent: i === 0 ? 1 : 0, horizontal: i === 0 ? "left" : "right" };
        c.border = { bottom: { style: "thin", color: { argb: CINZA_BORDA } } };
      });
      this.r++;
    }
    const ultima = this.r - 1;
    return { primeira, ultima, colLetra: (i: number) => String.fromCharCode(65 + i) };
  }

  espaco() { this.r++; }

  /** Nº da linha atual (para montar fórmulas que referenciam células por vir). */
  get linhaAtual(): number { return this.r; }
}

/** Serializa a planilha para Buffer (Node) — usado na rota /api/planilha. */
export async function planilhaBuffer(wb: ExcelJS.Workbook): Promise<Buffer> {
  const ab = await wb.xlsx.writeBuffer();
  return Buffer.from(ab);
}

// ------------------------------------------------------------------ Helpers de builder

/** Coerção segura para número finito. */
export const num = (v: unknown): number => (typeof v === "number" && Number.isFinite(v) ? v : 0);

/** Faixa de título + subtítulo (cliente/ref) no topo da aba. */
export function cabecalho(a: Aba, titulo: string, d: { cliente?: string; referencia?: string }) {
  const sub = [d.cliente ? `Cliente: ${d.cliente}` : "", d.referencia ? `Ref.: ${d.referencia}` : ""].filter(Boolean).join("  ·  ");
  a.titulo(titulo, sub || undefined);
}

/**
 * Bloco "custo × Fator K" (Carregador/QGBT/Execução SE): recebe a ref da célula
 * do custo e escreve Fator K (editável) → faturamento → impostos → lucro → margem,
 * tudo como fórmula viva.
 */
export function blocoFatorK(a: Aba, custoRef: string, custo: number, fatorK: number, aliq: number, labelFat = "Faturamento (preço ao cliente)") {
  const kRef = a.campo("Fator K (markup)", fatorK, { fmt: NUM, nota: "editável — recalcula abaixo" });
  const fat = custo * fatorK;
  const fatRef = a.formula(labelFat, `${custoRef}*${kRef}`, fat, { fmt: BRL, destaque: true });
  const impRef = a.campo("Impostos / NF", aliq, { fmt: PCT });
  const imp = fat * aliq;
  const impValRef = a.formula("Impostos (R$)", `${fatRef}*${impRef}`, imp, {});
  const lucro = fat - custo - imp;
  const lucroRef = a.formula("Lucro", `${fatRef}-${custoRef}-${impValRef}`, lucro, {});
  a.formula("Margem líquida", `${lucroRef}/${fatRef}`, fat > 0 ? lucro / fat : 0, { fmt: PCT, destaque: true });
}

/**
 * Tabela de composição de custo (descrição, un, qtd, valor unit, total=qtd*unit).
 * Retorna a ref da célula com a SOMA dos totais.
 */
export function tabelaCusto(a: Aba, itens: { descricao: string; unidade?: string; qtd: number; precoUnit: number }[], labelSoma = "Custo total"): string {
  const dataStart = a.linhaAtual + 1;
  const linhas = itens.map((m, i) => {
    const rn = dataStart + i;
    return [m.descricao || "—", m.unidade || "un", num(m.qtd), num(m.precoUnit), { formula: `C${rn}*D${rn}`, result: num(m.qtd) * num(m.precoUnit) }];
  });
  const t = a.tabela(["Descrição", "Un.", "Qtd", "Valor unit.", "Total"], linhas, [undefined, undefined, NUM, BRL, BRL]);
  const soma = itens.reduce((s, m) => s + num(m.qtd) * num(m.precoUnit), 0);
  return a.formula(labelSoma, `SUM(E${t.primeira}:E${t.ultima})`, soma, { bold: true });
}

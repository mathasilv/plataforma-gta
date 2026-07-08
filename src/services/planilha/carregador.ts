import ExcelJS from "exceljs";
import { Aba, novaPlanilha, cabecalho, blocoFatorK, tabelaCusto, num } from "./core";

/** Planilha do Carregador EV: dimensionamento + BOM → custo → Fator K → margem. */
export function planilhaCarregador(d: {
  cliente?: string; referencia?: string;
  sizing?: { potenciaKw?: number; corrente?: number; disjuntor?: number; secaoCabo?: number; dr?: string };
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
  const moUnitRef = a.campo("Mão de obra por ponto", num(d.maoObraPorPonto), { fmt: 'R$ #,##0.00' });
  const qtdRef = a.campo("Nº de pontos", num(d.qtdPontos), { fmt: '#,##0.00' });
  const mo = num(d.maoObraPorPonto) * num(d.qtdPontos);
  const moRef = a.formula("Mão de obra total", `${moUnitRef}*${qtdRef}`, mo, { fmt: 'R$ #,##0.00' });
  const custoGeral = d.materiais.reduce((s, m) => s + num(m.qtd) * num(m.precoUnit), 0) + mo;
  const custoGeralRef = a.formula("Custo geral", `${custoMatRef}+${moRef}`, custoGeral, { fmt: 'R$ #,##0.00', bold: true });
  a.espaco();

  a.secao("Preço e margem");
  blocoFatorK(a, custoGeralRef, custoGeral, num(d.fatorK), num(d.aliqImpostos));
  return wb;
}

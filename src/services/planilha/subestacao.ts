import ExcelJS from "exceljs";
import { Aba, novaPlanilha, cabecalho, num, BRL, PCT } from "./core";

/**
 * Planilha do Projeto de Subestação — modelo por custo, com FÓRMULAS VIVAS:
 *   custo = horas × valor/hora + ART
 *   preço = custo × (1 + margem)
 * Campos editáveis (o usuário altera no Excel e tudo recalcula): horas,
 * valor/hora, ART e margem. As horas e o kVA vêm do dimensionamento (NT.002).
 */
export function planilhaSubestacao(d: {
  cliente?: string;
  referencia?: string;
  horas: number;
  valorHora: number;
  art: number;
  margem: number;
  kVA?: number;
}): ExcelJS.Workbook {
  const wb = novaPlanilha();
  const a = new Aba(wb, "Precificação");
  cabecalho(a, "Projeto de Subestação — Precificação", { cliente: d.cliente, referencia: d.referencia });

  a.secao("Composição de custo");
  const horasRef = a.campo("Horas de engenharia", num(d.horas), {
    fmt: '0.0 "h"',
    nota: d.kVA ? `Transformador ${num(d.kVA)} kVA (NT.002)` : undefined,
  });
  const valorHoraRef = a.campo("Valor da hora", num(d.valorHora), { fmt: BRL, nota: "editável" });
  const artRef = a.campo("ART / taxas fixas", num(d.art), { fmt: BRL, nota: "editável" });
  const custo = num(d.horas) * num(d.valorHora) + num(d.art);
  const custoRef = a.formula("Custo do projeto", `${horasRef}*${valorHoraRef}+${artRef}`, custo, { fmt: BRL, bold: true });
  a.espaco();

  a.secao("Preço e margem");
  const margemRef = a.campo("Margem", num(d.margem), { fmt: PCT, nota: "editável — recalcula abaixo" });
  const preco = custo * (1 + num(d.margem));
  a.formula("Preço ao cliente", `${custoRef}*(1+${margemRef})`, preco, { fmt: BRL, destaque: true });

  return wb;
}

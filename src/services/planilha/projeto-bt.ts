import ExcelJS from "exceljs";
import { Aba, novaPlanilha, cabecalho, num, BRL, NUM } from "./core";

/**
 * Planilha do Projeto Elétrico de Baixa Tensão (por disciplina). O preço de cada
 * disciplina selecionada é uma FÓRMULA VIVA:
 *
 *   Valor = MAX(Área × Taxa R$/m² × Multiplicador, Piso)
 *
 * A Área e o Multiplicador (1 comercial / 1,4 industrial) são células editáveis;
 * cada linha da tabela referencia a taxa e o piso da própria linha. O Total é a
 * SOMA dos valores. O usuário abre no Excel, ajusta área/mult/taxas/pisos e tudo
 * recalcula.
 */
export function planilhaProjetoBt(d: {
  cliente?: string; referencia?: string;
  area: number; mult: number;
  disciplinas: { nome: string; taxaM2: number; piso: number }[];
}): ExcelJS.Workbook {
  const wb = novaPlanilha();
  const a = new Aba(wb, "Precificação");
  cabecalho(a, "Projeto Elétrico de Baixa Tensão — Precificação", { cliente: d.cliente, referencia: d.referencia });

  a.secao("Porte do projeto");
  const areaRef = a.campo("Área (m²)", num(d.area), { fmt: '#,##0.00 "m²"' });
  const multRef = a.campo("Multiplicador", num(d.mult), { fmt: NUM, nota: "1 comercial · 1,4 industrial" });
  a.espaco();

  a.secao("Disciplinas contratadas");
  const disciplinas = d.disciplinas ?? [];
  // A tabela escreve primeiro a linha de cabeçalho (linhaAtual), então os dados
  // começam em linhaAtual + 1 — cada Valor referencia a taxa/piso da sua linha.
  const dataStart = a.linhaAtual + 1;
  const linhas = disciplinas.map((disc, i) => {
    const rn = dataStart + i;
    const taxa = num(disc.taxaM2);
    const piso = num(disc.piso);
    const valor = Math.max(num(d.area) * taxa * num(d.mult), piso);
    return [
      disc.nome || "—",
      taxa,
      piso,
      { formula: `MAX(${areaRef}*B${rn}*${multRef},C${rn})`, result: valor },
    ];
  });
  const t = a.tabela(["Disciplina", "Taxa R$/m²", "Piso", "Valor"], linhas, [undefined, BRL, BRL, BRL]);

  const total = disciplinas.reduce(
    (s, disc) => s + Math.max(num(d.area) * num(disc.taxaM2) * num(d.mult), num(disc.piso)),
    0,
  );
  a.formula(
    "Total do projeto",
    disciplinas.length ? `SUM(D${t.primeira}:D${t.ultima})` : "0",
    total,
    { fmt: BRL, bold: true, destaque: true },
  );

  return wb;
}

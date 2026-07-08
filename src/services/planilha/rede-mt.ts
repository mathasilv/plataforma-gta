import ExcelJS from "exceljs";
import { Aba, novaPlanilha, cabecalho, num, BRL, PCT, NUM } from "./core";

/**
 * Planilha da Rede de Distribuição MT/BT (DUAL): uma tabela de custos por etapa
 * (projeto / execução) com Total = Qtd × Valor un., somada por etapa via SUMIF, e
 * dois blocos de faturamento com fórmulas vivas:
 *
 *   PROJETO  = custo × Fator K / (1 − NF)   (NF "por dentro"; padrão K 1,889 / NF 15%)
 *   EXECUÇÃO = custo × Fator K              (NF sobre o faturamento; padrão K 1,7 / NF 6%)
 *
 * Total ao cliente = faturamento(projeto) + faturamento(execução). O usuário abre
 * no Excel, ajusta custos/Fator K/NF e tudo recalcula.
 */
export function planilhaRedeMt(d: {
  cliente?: string;
  referencia?: string;
  custoRows: { etapa: "projeto" | "execucao"; descricao: string; qtd: number; valorUnit: number }[];
  fatorKProjeto?: number;
  nfProjeto?: number;
  fatorKExecucao?: number;
  nfExecucao?: number;
}): ExcelJS.Workbook {
  const wb = novaPlanilha();
  const a = new Aba(wb, "Precificação");
  // Colunas: A = Etapa / rótulos · B = Descrição / valores · C = Qtd · D = Valor un. · E = Total.
  a.ws.getColumn(2).width = 42;
  a.ws.getColumn(3).width = 12;

  cabecalho(a, "Rede de Distribuição MT/BT — Precificação", { cliente: d.cliente, referencia: d.referencia });

  // Parâmetros de preço (defaults GTA se não vierem do configurador).
  const kProj = num(d.fatorKProjeto) || 1.889;
  const nfProj = Number.isFinite(d.nfProjeto as number) ? (d.nfProjeto as number) : 0.15;
  const kExec = num(d.fatorKExecucao) || 1.7;
  const nfExec = Number.isFinite(d.nfExecucao as number) ? (d.nfExecucao as number) : 0.06;

  const rows = (d.custoRows ?? []).map((r) => ({
    key: r.etapa,
    etapa: r.etapa === "projeto" ? "Projeto" : "Execução",
    descricao: r.descricao || "—",
    qtd: num(r.qtd),
    valorUnit: num(r.valorUnit),
  }));

  // ---- Tabela de custos: Total = Qtd × Valor un. (fórmula viva por linha) ----
  a.secao("Composição de custo por etapa");
  const dataStart = a.linhaAtual + 1; // 1ª linha de dados (após o cabeçalho da tabela)
  const linhas = rows.map((r, i) => {
    const rn = dataStart + i;
    return [r.etapa, r.descricao, r.qtd, r.valorUnit, { formula: `C${rn}*D${rn}`, result: r.qtd * r.valorUnit }];
  });
  const t = a.tabela(["Etapa", "Descrição", "Qtd", "Valor un.", "Total"], linhas, [undefined, undefined, NUM, BRL, BRL]);
  a.espaco();

  // ---- Somas por etapa (SUMIF sobre a coluna Etapa × coluna Total) ----
  const custoProjNum = rows.filter((r) => r.key === "projeto").reduce((s, r) => s + r.qtd * r.valorUnit, 0);
  const custoExecNum = rows.filter((r) => r.key === "execucao").reduce((s, r) => s + r.qtd * r.valorUnit, 0);
  const etapaRange = `A${t.primeira}:A${t.ultima}`;
  const totalRange = `E${t.primeira}:E${t.ultima}`;
  const custoProjRef = a.formula("Custo do projeto", `SUMIF(${etapaRange},"Projeto",${totalRange})`, custoProjNum, { fmt: BRL, bold: true });
  const custoExecRef = a.formula("Custo da execução", `SUMIF(${etapaRange},"Execução",${totalRange})`, custoExecNum, { fmt: BRL, bold: true });
  a.espaco();

  // ---- PROJETO: faturamento = custo × Fator K / (1 − NF) ----
  a.secao("Projeto — faturamento (NF por dentro)");
  const kProjRef = a.campo("Fator K (projeto)", kProj, { fmt: NUM, nota: "editável — recalcula abaixo" });
  const nfProjRef = a.campo("NF projeto (por dentro)", nfProj, { fmt: PCT });
  const fatProjNum = custoProjNum > 0 ? (custoProjNum * kProj) / (1 - nfProj) : 0;
  const fatProjRef = a.formula("Faturamento do projeto", `${custoProjRef}*${kProjRef}/(1-${nfProjRef})`, fatProjNum, { fmt: BRL, destaque: true });
  const impProjNum = fatProjNum * nfProj;
  const impProjRef = a.formula("Impostos / NF (projeto)", `${fatProjRef}*${nfProjRef}`, impProjNum);
  const lucroProjNum = fatProjNum - custoProjNum - impProjNum;
  const lucroProjRef = a.formula("Lucro do projeto", `${fatProjRef}-${custoProjRef}-${impProjRef}`, lucroProjNum);
  a.formula("Margem líquida (projeto)", `IF(${fatProjRef}=0,0,${lucroProjRef}/${fatProjRef})`, fatProjNum > 0 ? lucroProjNum / fatProjNum : 0, { fmt: PCT, destaque: true });
  a.espaco();

  // ---- EXECUÇÃO: faturamento = custo × Fator K (NF sobre o faturamento) ----
  a.secao("Execução — faturamento (NF sobre o faturamento)");
  const kExecRef = a.campo("Fator K (execução)", kExec, { fmt: NUM, nota: "editável — recalcula abaixo" });
  const nfExecRef = a.campo("NF execução", nfExec, { fmt: PCT });
  const fatExecNum = custoExecNum > 0 ? custoExecNum * kExec : 0;
  const fatExecRef = a.formula("Faturamento da execução", `${custoExecRef}*${kExecRef}`, fatExecNum, { fmt: BRL, destaque: true });
  const impExecNum = fatExecNum * nfExec;
  const impExecRef = a.formula("Impostos / NF (execução)", `${fatExecRef}*${nfExecRef}`, impExecNum);
  const lucroExecNum = fatExecNum - custoExecNum - impExecNum;
  const lucroExecRef = a.formula("Lucro da execução", `${fatExecRef}-${custoExecRef}-${impExecRef}`, lucroExecNum);
  a.formula("Margem líquida (execução)", `IF(${fatExecRef}=0,0,${lucroExecRef}/${fatExecRef})`, fatExecNum > 0 ? lucroExecNum / fatExecNum : 0, { fmt: PCT, destaque: true });
  a.espaco();

  // ---- Total ao cliente = faturamento(projeto) + faturamento(execução) ----
  a.secao("Total ao cliente");
  a.formula("Total ao cliente (projeto + execução)", `${fatProjRef}+${fatExecRef}`, fatProjNum + fatExecNum, { fmt: BRL, bold: true, destaque: true });

  return wb;
}

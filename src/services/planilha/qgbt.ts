import ExcelJS from "exceljs";
import { Aba, novaPlanilha, cabecalho, blocoFatorK, num, BRL, NUM } from "./core";

/**
 * Planilha do QGBT (Quadro Geral de Baixa Tensão): produto manufaturado
 * precificado por custo × Fator K.
 *   custo total  = custo por quadro × nº de quadros
 *   faturamento  = custo total × Fator K   (padrão 1,55)
 *   impostos/NF  = faturamento × alíquota  (padrão 15%)
 *   margem líq.  = (faturamento − custo − impostos) / faturamento
 * Todas as células de saída são FÓRMULAS vivas — mude custo/Fator K/impostos no
 * Excel e o preço e a margem recalculam.
 */
export function planilhaQgbt(d: {
  cliente?: string; referencia?: string;
  especificacao?: string;
  custoUnitario?: number; qtdQuadros?: number;
  custo?: number; valorServico?: number;
  fatorK?: number; aliqImpostos?: number;
}): ExcelJS.Workbook {
  const wb = novaPlanilha();
  const a = new Aba(wb, "Precificação");
  cabecalho(a, "Fornecimento de QGBT — Precificação", { cliente: d.cliente, referencia: d.referencia });

  const fatorK = num(d.fatorK) || 1.55;
  const aliq = d.aliqImpostos != null ? num(d.aliqImpostos) : 0.15;

  if (d.especificacao) {
    a.secao("Quadro");
    a.campo("Especificação (A / V)", d.especificacao);
    a.espaco();
  }

  a.secao("Composição de custo");
  let custoRef: string;
  let custo: number;
  const custoUnit = num(d.custoUnitario);
  if (custoUnit > 0) {
    // Custo base informado: custo por quadro × nº de quadros (fórmula viva).
    const qtd = Math.max(1, Math.floor(num(d.qtdQuadros) || 1));
    const unitRef = a.campo("Custo por quadro", custoUnit, { fmt: BRL });
    const qtdRef = a.campo("Nº de quadros", qtd, { fmt: NUM });
    custo = custoUnit * qtd;
    custoRef = a.formula("Custo total", `${unitRef}*${qtdRef}`, custo, { fmt: BRL, bold: true });
  } else {
    // Sem custo detalhado: usa o custo informado ou deriva do preço final (custo = preço ÷ Fator K).
    custo = num(d.custo) || (fatorK > 0 ? num(d.valorServico) / fatorK : 0);
    custoRef = a.campo("Custo total", custo, {
      fmt: BRL, bold: true,
      nota: num(d.custo) > 0 ? undefined : "estimado = preço ÷ Fator K",
    });
  }
  a.espaco();

  a.secao("Preço e margem");
  blocoFatorK(a, custoRef, custo, fatorK, aliq);

  return wb;
}

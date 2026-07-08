import ExcelJS from "exceljs";
import { Aba, novaPlanilha, cabecalho, blocoFatorK, num, BRL } from "./core";

/**
 * Planilha da Execução de Subestação: custo (materiais + mão de obra +
 * projeto/ART/outros) → custo × Fator K → impostos → lucro → margem, tudo como
 * FÓRMULA viva (ver ./core). Modelo idêntico ao QGBT/Carregador. Os equipamentos
 * principais (transformador, cubículo) são faturados à parte — entram só como nota.
 */
export function planilhaExecSe(d: {
  cliente?: string;
  referencia?: string;
  potenciaKva?: string;
  tipo?: string;
  custoMateriais?: number;
  custoMaoObra?: number;
  custoProjetoOutros?: number;
  /** Faturamento editável — usado p/ derivar o custo quando não há BOM. */
  valorServico?: number;
  /** Equipamentos principais faturados à parte (0 = por conta do cliente). */
  valorEquipamento?: number;
  fatorK: number;
  aliqImpostos: number;
}): ExcelJS.Workbook {
  const wb = novaPlanilha();
  const a = new Aba(wb, "Precificação");

  const tit = ["Execução de Subestação", d.potenciaKva ? `${d.potenciaKva} kVA` : "", d.tipo || ""]
    .filter(Boolean)
    .join(" — ");
  cabecalho(a, `${tit} — Precificação`, { cliente: d.cliente, referencia: d.referencia });

  const fatorK = num(d.fatorK) || 1.7;
  const aliq = num(d.aliqImpostos);

  const mat = num(d.custoMateriais);
  const mo = num(d.custoMaoObra);
  const outros = num(d.custoProjetoOutros);
  const custoBreak = mat + mo + outros;

  a.secao("Composição de custo (BOM do levantamento)");
  let custoRef: string;
  let custo: number;
  if (custoBreak > 0) {
    const matRef = a.campo("Materiais", mat, { fmt: BRL });
    const moRef = a.campo("Mão de obra", mo, { fmt: BRL });
    const outrosRef = a.campo("Projeto / ART / outros", outros, { fmt: BRL });
    custo = custoBreak;
    custoRef = a.formula("Custo total", `${matRef}+${moRef}+${outrosRef}`, custo, { fmt: BRL, bold: true });
  } else {
    // Sem BOM: deriva o custo do faturamento sugerido ÷ Fator K.
    custo = num(d.valorServico) > 0 && fatorK > 0 ? num(d.valorServico) / fatorK : 0;
    custoRef = a.campo("Custo", custo, { fmt: BRL, bold: true, nota: "estimado a partir do valor do serviço ÷ Fator K" });
  }
  a.espaco();

  a.secao("Preço e margem");
  blocoFatorK(a, custoRef, custo, fatorK, aliq);
  a.espaco();

  a.secao("Equipamentos principais (faturados à parte)");
  const equip = num(d.valorEquipamento);
  a.campo("Transformador / cubículo / acessórios", equip, {
    fmt: BRL,
    nota: equip > 0 ? "faturamento direto do equipamento — fora do Fator K" : "por conta do cliente",
  });

  return wb;
}

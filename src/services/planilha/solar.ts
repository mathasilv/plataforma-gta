import ExcelJS from "exceljs";
import { Aba, novaPlanilha, cabecalho, num, BRL, PCT, NUM } from "./core";

/** Dias por mês (28 em fevereiro, sem bissexto — como na planilha de geração). */
const DIAS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const HSP_FMT = "0.000";

/**
 * Planilha do Solar (fotovoltaico on-grid) com FÓRMULAS VIVAS.
 *
 * Aba "Preço" — codifica a aba Orçamento:
 *   Total    = Kit × Fator            (fórmula)
 *   Serviços = Total − Kit            (fórmula, faturamento GTA)
 *   Lucro líq. = Serviços − (custos)  (fórmula) → Margem líquida (fórmula)
 *
 * Aba "Geração" — codifica a Previsão de Geração:
 *   Geração_mês(kWh) = HSP × kWp × Eficiência × Dias   (fórmula por linha)
 *   Geração anual = SUM(...)
 */
export function planilhaSolar(d: {
  cliente?: string;
  referencia?: string;
  kit: number;
  fator: number;
  servicos?: number;
  valorTotal?: number;
  kwp?: number;
  eficiencia?: number; // fração (0,75 = 75%)
  custos?: {
    instalacao: number;
    materialCa: number;
    deslocamento: number;
    art: number;
    imposto: number;
    comissao: number;
  };
  geracao?: { mes: string; hsp: number; dias?: number }[];
}): ExcelJS.Workbook {
  const wb = novaPlanilha();
  const kit = num(d.kit);
  const fator = num(d.fator) || 1;

  // -------------------------------------------------------------- Aba Preço
  const a = new Aba(wb, "Preço");
  cabecalho(a, "Sistema Fotovoltaico On-Grid — Preço", { cliente: d.cliente, referencia: d.referencia });

  a.secao("Kit e fator (Total = Kit × Fator)");
  const kitRef = a.campo("Kit (cotação do distribuidor)", kit, { fmt: BRL });
  const fatorRef = a.campo("Fator (markup)", fator, { fmt: NUM, nota: "editável — recalcula abaixo" });
  const totalNum = d.valorTotal != null ? num(d.valorTotal) : kit * fator;
  const totalRef = a.formula("Valor total (ao cliente)", `${kitRef}*${fatorRef}`, totalNum, { fmt: BRL, destaque: true });
  const servicosNum = d.servicos != null ? num(d.servicos) : totalNum - kit;
  const servicosRef = a.formula("Serviços GTA (faturamento)", `${totalRef}-${kitRef}`, servicosNum, { fmt: BRL, bold: true });
  a.espaco();

  if (d.custos) {
    a.secao("Custos e margem (uso interno)");
    const c = d.custos;
    const instRef = a.campo("Instalação", num(c.instalacao), { fmt: BRL });
    const caRef = a.campo("Material CA", num(c.materialCa), { fmt: BRL });
    const deslRef = a.campo("Deslocamento", num(c.deslocamento), { fmt: BRL });
    const artRef = a.campo("ART", num(c.art), { fmt: BRL });
    const impRef = a.campo("Imposto / NF", num(c.imposto), { fmt: BRL });
    const comRef = a.campo("Comissão", num(c.comissao), { fmt: BRL });
    const custoNum = num(c.instalacao) + num(c.materialCa) + num(c.deslocamento) + num(c.art) + num(c.imposto) + num(c.comissao);
    const custoRef = a.formula("Custo total", `${instRef}+${caRef}+${deslRef}+${artRef}+${impRef}+${comRef}`, custoNum, { fmt: BRL, bold: true });
    const lucroNum = servicosNum - custoNum;
    const lucroRef = a.formula("Lucro líquido", `${servicosRef}-${custoRef}`, lucroNum, { fmt: BRL, destaque: true });
    a.formula("Margem líquida", `${lucroRef}/${servicosRef}`, servicosNum > 0 ? lucroNum / servicosNum : 0, { fmt: PCT, destaque: true });
  }

  // ----------------------------------------------------------- Aba Geração
  const linhasGer = d.geracao ?? [];
  if (linhasGer.length) {
    const kwp = num(d.kwp);
    const efic = num(d.eficiencia);
    const g = new Aba(wb, "Geração");
    cabecalho(g, "Previsão de Geração (12 meses)", { cliente: d.cliente, referencia: d.referencia });
    g.secao("Geração = HSP × kWp × Eficiência × Dias");

    const dataStart = g.linhaAtual + 1; // 1ª linha de dados (após o cabeçalho da tabela)
    const linhas = linhasGer.map((l, i) => {
      const rn = dataStart + i;
      const dias = num(l.dias) || DIAS[i] || 30;
      const hsp = num(l.hsp);
      return [
        l.mes,
        hsp,
        kwp,
        efic,
        dias,
        { formula: `B${rn}*C${rn}*D${rn}*E${rn}`, result: hsp * kwp * efic * dias },
      ];
    });
    const t = g.tabela(
      ["Mês", "HSP", "kWp", "Efic.", "Dias", "Geração (kWh)"],
      linhas,
      [undefined, HSP_FMT, NUM, PCT, "0", NUM],
    );
    const totalNumGer = linhasGer.reduce((s, l, i) => s + num(l.hsp) * kwp * efic * (num(l.dias) || DIAS[i] || 30), 0);
    g.espaco();
    g.formula("Geração anual (kWh)", `SUM(F${t.primeira}:F${t.ultima})`, totalNumGer, { fmt: NUM, destaque: true });
  }

  return wb;
}

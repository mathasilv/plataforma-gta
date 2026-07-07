import type { MapResult } from "../types";
import {
  addDays,
  buildReference,
  capitalize,
  formatBRL,
  formatDateLong,
  formatDateShort,
  moneyToWords,
  parseNumber,
} from "@/lib/format";
import type { CarregadorFormData } from "./config";

/**
 * Transforma os dados do configurador do Carregador EV nos marcadores do molde
 * `src/services/carregador/template.docx` (mesmo desenho da proposta Solar).
 * A tabela de dimensionamento reúne os dados NBR 5410 em 6 linhas.
 */
export function mapCarregador(form: CarregadorFormData): MapResult {
  const emissao = new Date(`${form.dataEmissao}T12:00:00`);
  const ano = emissao.getFullYear();
  const validadeData = addDays(emissao, form.validadeDias);
  const cidadeCurta = form.cidadeUf.split("/")[0]?.trim() || "Goiânia";

  const s = form.sizing;
  const monofasico = s.tensao <= 220;

  const potenciaFmt = `${form.potenciaKw.replace(".", ",")} kW`;
  const alimentacao = monofasico ? "Monofásico · 220 V" : "Trifásico · 380 V";

  // Investimento
  const valorServicoNum = parseNumber(form.valorServico);
  const valorEquipNum = parseNumber(form.valorEquipamento);
  const temEquip = valorEquipNum > 0;
  const valorTotalNum = valorServicoNum + valorEquipNum;

  const data = {
    // cabeçalho
    subtitulo: form.subtitulo,
    clienteTitulo: `${form.clienteNome.toUpperCase()} — ${form.cidadeUf.toUpperCase()}`,
    clienteCidade: `${form.clienteNome} — ${form.cidadeUf}`,
    objeto: form.objeto,
    referencia: buildReference("EV", form.clienteNome, form.referenciaSeq, ano),
    dataEmissao: formatDateLong(emissao, cidadeCurta),
    validade: `${formatDateShort(validadeData)} (${form.validadeDias} dias corridos)`,
    formaPagamento: form.formaPagamento,

    // §1 objetivo
    textoObjetivo: form.textoObjetivo,

    // §2 dimensionamento (NBR 5410) — 6 linhas
    potenciaAlim: `${potenciaFmt} · ${alimentacao}`,
    corrente: `${nf(s.correnteNominal, 1)} A nominal · ${nf(s.correnteProjeto, 1)} A projeto`,
    disjuntor: `${s.disjuntorA} A · curva C · ${s.polos}P`,
    protecaoDr: `DR Tipo ${s.drTipo} · ${s.disjuntorA} A · 30 mA (NBR 17019)`,
    condutorEletroduto: `${s.nCondutores} × ${nf(s.secaoMm2, s.secaoMm2 % 1 ? 1 : 0)} mm² (HEPR) · eletroduto ${s.eletroduto}`,
    protecoesComp: `${s.nDps} × DPS Classe II · queda ${nf(s.quedaPct * 100, 1)}% · aterramento dedicado`,

    // §4 composição (loop de materiais do BOM)
    materiais: form.materiais.map((m) => ({ qtde: m.qtde, descricao: m.descricao })),

    // §5 investimento
    valorServico: formatBRL(valorServicoNum),
    valorEquipamentoLabel: temEquip ? formatBRL(valorEquipNum) : "Por conta do cliente",
    valorTotal: formatBRL(valorTotalNum),
    valorTotalExtenso: capitalize(moneyToWords(valorTotalNum)) + ".",

    // economia não se aplica ao carregador (bloco condicional do molde fica oculto)
    temEconomia: false,
    economiaMensal: "",
    economiaAno1: "",
    paybackTexto: "",

    // §6 prazo
    prazoExecucao: form.prazoExecucao,

    // §11 aceite
    clienteNomeUpper: form.clienteNome.toUpperCase(),
    cidadeUf: form.cidadeUf,
    distribuidorNomeCurto: "",
  };

  return { data };
}

function nf(v: number, d = 1): string {
  return (Number.isFinite(v) ? v : 0).toLocaleString("pt-BR", { minimumFractionDigits: d, maximumFractionDigits: d });
}

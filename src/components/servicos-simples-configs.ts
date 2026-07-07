import type { ServicoSimplesConfig } from "./ServicoSimplesConfigurator";

/** Configs dos serviços de preço determinístico/paramétrico (configurador leve). */

const parseBR = (s: string) => {
  const t = String(s ?? "").trim();
  if (!t) return 0;
  return t.includes(",") ? Number(t.replace(/\./g, "").replace(",", ".")) : Number(t);
};
const brl = (v: number) => "R$ " + (Number.isFinite(v) ? v : 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const inteiro = (s: string, min = 1) => Math.max(min, Math.floor(Number(s) || min));

/**
 * Limpeza de placas: R$/placa cai muito com o volume (economia de escala).
 * Âncoras reais: ~R$ 50 (poucas) · ~R$ 24,50 (≈100) · R$ 4,10 (usina UniEvangélica,
 * 2.900 placas = R$ 11.890). Faixas intermediárias interpoladas.
 */
const taxaLimpezaPorVolume = (n: number) =>
  n <= 30 ? 50 : n <= 150 ? 25 : n <= 500 ? 12 : n <= 1500 ? 7 : 4.5;
const faixaLimpeza = (n: number) =>
  n <= 30 ? "≤30 placas" : n <= 150 ? "31–150" : n <= 500 ? "151–500" : n <= 1500 ? "501–1.500" : "usina 1.500+";

export const CONEXAO_CONFIG: ServicoSimplesConfig = {
  serviceKey: "conexao",
  tituloSecao: "Conexão junto à concessionária",
  tituloDoc: "PROPOSTA TÉCNICA E COMERCIAL — CONEXÃO JUNTO À CONCESSIONÁRIA",
  objetoPadrao:
    "Serviços de assessoria para conexão junto à concessionária, contemplando análise de viabilidade, liberação de carga, consultoria e acompanhamento interno até a efetiva conexão.",
  obsPadrao: [
    "Valor tabelado em 2 (dois) salários mínimos vigentes.",
    "Taxas e emolumentos da concessionária por conta do cliente.",
  ],
  prazoPadrao: "Conforme os trâmites da concessionária",
  campos: [
    { name: "salarioMinimo", label: "Salário mínimo vigente (R$)", type: "currency", width: "sm:col-span-2", default: "1630", help: "O orçamento é 2× este valor." },
  ],
  calcularPreco: (v) => 2 * parseBR(v.salarioMinimo),
  ajudaPreco: (v, p) => `2 × salário mínimo (${brl(parseBR(v.salarioMinimo))}) = ${brl(p)}`,
  montarDescricao: () =>
    "Orçamento de conexão: análise de viabilidade, liberação de carga, consultoria junto à concessionária e acompanhamento interno até a efetiva conexão (equivalente a 2 salários mínimos)",
  condicao: "50% na contratação e 50% após a efetiva conexão",
};

export const ANALISADOR_CONFIG: ServicoSimplesConfig = {
  serviceKey: "analisador",
  tituloSecao: "Medição",
  tituloDoc: "PROPOSTA TÉCNICA E COMERCIAL — ANÁLISE DE ENERGIA",
  objetoPadrao:
    "Locação de analisador de energia com instalação, parametrização, período de medição e emissão de relatório técnico com os registros de grandezas elétricas.",
  obsPadrao: [
    "Valor tabelado: R$ 1.500,00 por semana de locação.",
    "Instalação e retirada do equipamento inclusas.",
    "Relatório técnico entregue ao final do período de medição.",
  ],
  prazoPadrao: "Conforme o período de medição + emissão do relatório",
  campos: [
    { name: "semanas", label: "Semanas de medição", type: "number", width: "sm:col-span-2", default: "1" },
    { name: "valorSemana", label: "Valor por semana (R$)", type: "currency", width: "sm:col-span-2", default: "1500" },
  ],
  calcularPreco: (v) => parseBR(v.valorSemana) * inteiro(v.semanas),
  ajudaPreco: (v, p) => `${inteiro(v.semanas)} semana(s) × ${brl(parseBR(v.valorSemana))} = ${brl(p)}`,
  montarDescricao: (v) => {
    const s = inteiro(v.semanas);
    return `Locação de analisador de energia por ${s} semana${s > 1 ? "s" : ""}, incluindo instalação, medição e relatório técnico`;
  },
  condicao: "100% na retirada do relatório",
};

export const LAUDO_CONFIG: ServicoSimplesConfig = {
  serviceKey: "laudo-inspecao",
  tituloSecao: "Inspeção",
  tituloDoc: "PROPOSTA TÉCNICA E COMERCIAL — LAUDO E INSPEÇÃO TÉCNICA",
  objetoPadrao:
    "Vistoria técnica das instalações com emissão de laudo e ART, atestando as condições de conformidade conforme as normas técnicas aplicáveis.",
  obsPadrao: [
    "Serviços conforme normas técnicas vigentes.",
    "Emissão de ART inclusa.",
    "Correções apontadas no laudo são orçadas à parte.",
  ],
  prazoPadrao: "10 a 15 dias após a vistoria",
  campos: [
    { name: "qtdUnidades", label: "Nº de unidades (torres/edificações)", type: "number", width: "sm:col-span-2", default: "1" },
    { name: "valorUnidade", label: "Valor por unidade (R$)", type: "currency", width: "sm:col-span-2", default: "2500" },
    { name: "escopoLaudo", label: "Escopo do laudo", type: "text", width: "sm:col-span-2", default: "instalações elétricas, SPDA e iluminação de emergência" },
  ],
  calcularPreco: (v) => parseBR(v.valorUnidade) * inteiro(v.qtdUnidades),
  ajudaPreco: (v, p) => `${inteiro(v.qtdUnidades)} unidade(s) × ${brl(parseBR(v.valorUnidade))} = ${brl(p)}`,
  montarDescricao: (v) => {
    const q = inteiro(v.qtdUnidades);
    return `Vistoria técnica, laudo e ART (${v.escopoLaudo}) — ${q} ${q > 1 ? "unidades" : "unidade"}`;
  },
  condicao: "",
};

export const LIMPEZA_CONFIG: ServicoSimplesConfig = {
  serviceKey: "limpeza",
  tituloSecao: "Limpeza",
  tituloDoc: "PROPOSTA TÉCNICA E COMERCIAL — LIMPEZA DE PLACAS FOTOVOLTAICAS",
  objetoPadrao:
    "Limpeza técnica de módulos fotovoltaicos, com inspeção prévia, procedimento de segurança (NR-10/NR-35) e relatório fotográfico do antes e depois.",
  obsPadrao: [
    "Acesso especial (plataformas/andaimes), quando necessário, é orçado à parte.",
    "Serviço executado com equipe e equipamentos de segurança conforme NR-10 e NR-35.",
    "Em usinas de grande porte, a limpeza pode ser feita com robô autônomo, sem interromper a geração.",
  ],
  prazoPadrao: "A combinar conforme agenda",
  campos: [
    { name: "qtdPlacas", label: "Nº de placas", type: "number", width: "sm:col-span-2", default: "", placeholder: "Ex.: 120" },
    { name: "valorPorPlaca", label: "Valor por placa (R$) — opcional", type: "currency", width: "sm:col-span-2", default: "", help: "Em branco: faixa automática por volume (≤30 → R$ 50 · ~100 → R$ 25 · ~500 → R$ 12 · usina 1.500+ → R$ 4,50). Preencha para fixar." },
    { name: "valorMinimo", label: "Valor mínimo (R$)", type: "currency", width: "sm:col-span-2", default: "900", help: "Piso da visita." },
  ],
  calcularPreco: (v) => {
    const n = Math.max(0, Math.floor(Number(v.qtdPlacas) || 0));
    const manual = parseBR(v.valorPorPlaca);
    const taxa = manual > 0 ? manual : taxaLimpezaPorVolume(n);
    return Math.max(taxa * n, parseBR(v.valorMinimo));
  },
  ajudaPreco: (v, p) => {
    const n = Math.max(0, Math.floor(Number(v.qtdPlacas) || 0));
    if (n <= 0) return "Informe o nº de placas para calcular a sugestão.";
    const manual = parseBR(v.valorPorPlaca);
    const taxa = manual > 0 ? manual : taxaLimpezaPorVolume(n);
    const origem = manual > 0 ? "valor fixado" : `faixa ${faixaLimpeza(n)}`;
    const calc = taxa * n;
    const piso = parseBR(v.valorMinimo);
    return `${n} placas × ${brl(taxa)} (${origem}) = ${brl(calc)}${calc < piso ? ` · piso ${brl(piso)}` : ""} → ${brl(p)}`;
  },
  montarDescricao: (v) => {
    const n = Math.max(0, Math.floor(Number(v.qtdPlacas) || 0));
    return `Limpeza técnica de ${n} ${n > 1 ? "módulos" : "módulo"} fotovoltaico(s), com inspeção prévia e relatório fotográfico`;
  },
  condicao: "",
};

/**
 * Mapa key → config. O configurador (client) resolve o config a partir do
 * `serviceKey` — assim o Server Component passa apenas uma string (funções não
 * podem cruzar a fronteira server→client).
 */
export const SERVICOS_SIMPLES: Record<string, ServicoSimplesConfig> = {
  conexao: CONEXAO_CONFIG,
  analisador: ANALISADOR_CONFIG,
  "laudo-inspecao": LAUDO_CONFIG,
  limpeza: LIMPEZA_CONFIG,
};

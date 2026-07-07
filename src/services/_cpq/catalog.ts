import { z } from "zod";
import type { FieldDef } from "../types";
import { criarServicoCpq, hint } from "./factory";
import type { ItemProposta } from "./proposta";
import { parseNumber } from "@/lib/format";

/**
 * Catálogo de serviços de engenharia elétrica da GTA, com precificação base
 * derivada da análise das propostas reais (2024–2026). Cada serviço puxa uma
 * sugestão de preço (mediana histórica, por variável) que o orçamentista revisa.
 *
 * Regras fixas de gestão ficam nos serviços dedicados (conexão = 2 salários
 * mínimos; analisador = R$ 1.500/semana). O serviço Solar tem configurador
 * próprio e não passa por aqui.
 */

const num = (v: unknown) => parseNumber(v);

/** Campo de moeda com valor sugerido + faixa histórica no help. */
function moeda(name: string, label: string, def: number, help: string, width: FieldDef["width"] = "third"): FieldDef {
  return { name, label, type: "currency", required: true, width, defaultValue: String(def), help };
}
const moedaZod = z.string().min(1, "Informe o valor");

// Projeto de Subestação tem configurador próprio (dimensionamento automático):
// ver src/services/subestacao.

// --------------------------------------------------------------- Subestação (execução)

export const execucaoSubestacaoService = criarServicoCpq({
  key: "execucao-subestacao",
  label: "Execução de Subestação",
  description: "Montagem eletromecânica e comissionamento de subestação (equipamentos faturados à parte).",
  icon: "⚙️",
  referencePrefix: "EXECSE",
  titulo: (f) => `PROPOSTA TÉCNICA E COMERCIAL — EXECUÇÃO DE SUBESTAÇÃO ${f.potenciaKva ? `${f.potenciaKva} kVA` : ""}`.trim(),
  descricaoServicoSecao: "Base histórica (serviços de engenharia): 300 kVA ~R$ 118 mil; 750 kVA ~R$ 160 mil; 2 MVA (comissionamento) ~R$ 131 mil.",
  camposServico: [
    { name: "potenciaKva", label: "Potência (kVA)", type: "number", width: "third", placeholder: "Ex.: 750" },
    moeda("valorServicos", "Serviços de engenharia (R$)", 120000, `Sugestão ${hint(120000)} — ajuste conforme o porte (kVA) e o escopo.`, "half"),
  ],
  zodServico: {
    potenciaKva: z.coerce.number().optional().default(0),
    valorServicos: moedaZod,
  },
  montarItens: (f): ItemProposta[] => {
    const kva = Number(f.potenciaKva) || 0;
    return [{
      descricao: `Execução completa da subestação${kva ? ` de ${kva} kVA` : ""}: obra civil, montagem eletromecânica, aterramento, comissionamento e ART (equipamentos e materiais faturados diretamente ao cliente)`,
      valor: num(f.valorServicos),
      condicao: "30% de entrada e saldo conforme cronograma físico-financeiro",
    }];
  },
  objetoPadrao:
    "Execução completa da subestação, contemplando obra civil, montagem eletromecânica, aterramento, ensaios de comissionamento e a documentação técnica pertinente.",
  observacoesPadrao: [
    "Equipamentos e materiais principais faturados diretamente ao cliente.",
    "Serviços conforme normas técnicas vigentes e padrões da concessionária.",
    "Energização sujeita à liberação da concessionária.",
  ],
  prazoPadrao: "60 a 90 dias",
});

// SPDA e Gerenciamento de Risco tem configurador próprio (preço por bloco +
// por m², com piso e painel de margem): ver src/services/spda.

// --------------------------------------------------------------- Laudo / Inspeção

export const laudoInspecaoService = criarServicoCpq({
  key: "laudo-inspecao",
  label: "Laudo e Inspeção Técnica",
  description: "Vistoria, laudo e ART (instalações, SPDA, iluminação de emergência) por edificação/torre.",
  icon: "🔍",
  referencePrefix: "LAUDO",
  titulo: () => "PROPOSTA TÉCNICA E COMERCIAL — LAUDO E INSPEÇÃO TÉCNICA",
  descricaoServicoSecao: "Base histórica: ~R$ 2.000–2.500 por edificação/torre; inspeção de subestação com termografia ~R$ 15.000.",
  camposServico: [
    { name: "qtdUnidades", label: "Nº de unidades (torres/edificações)", type: "number", width: "third", defaultValue: 1 },
    moeda("valorUnidade", "Valor por unidade (R$)", 2500, `Sugestão ${hint(2500)}/unidade (vistoria + laudo + ART).`),
    { name: "escopoLaudo", label: "Escopo do laudo", type: "text", width: "third", defaultValue: "instalações elétricas, SPDA e iluminação de emergência" },
  ],
  zodServico: {
    qtdUnidades: z.coerce.number().int().min(1).default(1),
    valorUnidade: moedaZod,
    escopoLaudo: z.string().optional().default("instalações elétricas, SPDA e iluminação de emergência"),
  },
  montarItens: (f): ItemProposta[] => {
    const qtd = Number(f.qtdUnidades) || 1;
    return [{
      descricao: `Vistoria técnica, laudo e ART (${f.escopoLaudo}) — ${qtd} ${qtd > 1 ? "unidades" : "unidade"}`,
      valor: num(f.valorUnidade) * qtd,
      condicao: "",
    }];
  },
  objetoPadrao:
    "Vistoria técnica das instalações com emissão de laudo e ART, atestando as condições de conformidade conforme as normas técnicas aplicáveis.",
  observacoesPadrao: [
    "Serviços conforme normas técnicas vigentes.",
    "Emissão de ART inclusa.",
    "Correções apontadas no laudo são orçadas à parte.",
  ],
  prazoPadrao: "10 a 15 dias após a vistoria",
});

// Carregador Veicular (EV) tem configurador próprio (dimensionamento NBR 5410
// + lista de materiais + preço por custo): ver src/services/carregador.

// --------------------------------------------------------------- Rede MT/BT

export const redeMtService = criarServicoCpq({
  key: "rede-mt",
  label: "Rede de Distribuição MT/BT",
  description: "Projeto e/ou execução de rede MT/BT (loteamentos, extensões rurais).",
  icon: "🏗️",
  referencePrefix: "REDEMT",
  titulo: () => "PROPOSTA TÉCNICA E COMERCIAL — REDE DE DISTRIBUIÇÃO MT/BT",
  descricaoServicoSecao: "Base histórica: projeto de rede/loteamento ~R$ 8.000–19.000; execução (mão de obra) a partir de ~R$ 60.000 (materiais faturados à parte).",
  camposServico: [
    { name: "extensao", label: "Extensão / porte", type: "text", width: "third", placeholder: "Ex.: 1 km 13,8 kV / loteamento 80 lotes" },
    moeda("valorProjeto", "Projeto (R$, 0 = não incluir)", 12000, `Projeto executivo + ART. Sugestão ${hint(12000)}.`),
    { name: "valorExecucao", label: "Execução (R$, 0 = não incluir)", type: "currency", width: "third", defaultValue: "0", help: "Mão de obra de execução; materiais normalmente faturados ao cliente." },
  ],
  zodServico: {
    extensao: z.string().optional().default(""),
    valorProjeto: moedaZod,
    valorExecucao: z.string().optional().default("0"),
  },
  montarItens: (f): ItemProposta[] => {
    const ext = String(f.extensao ?? "").trim();
    const suf = ext ? ` (${ext})` : "";
    const itens: ItemProposta[] = [];
    if (num(f.valorProjeto) > 0) itens.push({ descricao: `Projeto executivo de rede de distribuição MT/BT${suf}, com dimensionamentos, memoriais, ART e aprovação junto à concessionária`, valor: num(f.valorProjeto), condicao: "50% na contratação e 50% na entrega" });
    if (num(f.valorExecucao) > 0) itens.push({ descricao: `Execução da rede MT/BT${suf}: postes, estruturas, cabos, proteções, aterramento e comissionamento (materiais faturados ao cliente)`, valor: num(f.valorExecucao), condicao: "conforme cronograma físico-financeiro" });
    return itens;
  },
  objetoPadrao:
    "Serviços de engenharia para rede de distribuição em média e baixa tensão, contemplando o projeto executivo (e a execução, quando aplicável) conforme os padrões da concessionária.",
  observacoesPadrao: [
    "Serviços conforme normas técnicas vigentes e padrões da concessionária.",
    "Materiais e equipamentos principais faturados diretamente ao cliente na execução.",
    "Aprovação e energização sujeitas à concessionária.",
  ],
  prazoPadrao: "45 a 90 dias",
});

// --------------------------------------------------------------- Projeto elétrico BT

export const projetoEletricoBtService = criarServicoCpq({
  key: "projeto-bt",
  label: "Projeto Elétrico (BT)",
  description: "Projeto elétrico predial/industrial de baixa tensão (força, iluminação, dados).",
  icon: "✏️",
  referencePrefix: "PROJBT",
  titulo: () => "PROPOSTA TÉCNICA E COMERCIAL — PROJETO ELÉTRICO DE BAIXA TENSÃO",
  descricaoServicoSecao: "Base histórica: ~R$ 2.000 (provisório) a ~R$ 20.000 (industrial); predial ~R$ 5.000–18.000 conforme porte.",
  camposServico: [
    { name: "porte", label: "Porte / área", type: "text", width: "third", placeholder: "Ex.: 800 m² / edifício 21 pavimentos" },
    moeda("valorProjeto", "Valor do projeto (R$)", 8000, `Sugestão ${hint(8000)} — ajuste conforme porte e disciplinas.`, "half"),
  ],
  zodServico: {
    porte: z.string().optional().default(""),
    valorProjeto: moedaZod,
  },
  montarItens: (f): ItemProposta[] => {
    const porte = String(f.porte ?? "").trim();
    return [{
      descricao: `Elaboração de projeto elétrico de baixa tensão${porte ? ` (${porte})` : ""}, com pranchas, memoriais, quantitativos e ART`,
      valor: num(f.valorProjeto),
      condicao: "50% na contratação e 50% na entrega",
    }];
  },
  objetoPadrao:
    "Elaboração de projeto elétrico de baixa tensão (força, iluminação e/ou dados), contemplando pranchas, memoriais descritivos, quantitativos e ART.",
  observacoesPadrao: [
    "Serviços conforme a ABNT NBR 5410 e demais normas aplicáveis.",
    "Revisões por alteração de escopo do cliente são orçadas à parte.",
  ],
  prazoPadrao: "20 a 45 dias",
});

// --------------------------------------------------------------- QGBT

export const qgbtService = criarServicoCpq({
  key: "qgbt",
  label: "Fornecimento de QGBT",
  description: "Quadro Geral de Baixa Tensão montado, identificado e testado.",
  icon: "🔌",
  referencePrefix: "QGBT",
  titulo: () => "PROPOSTA TÉCNICA E COMERCIAL — FORNECIMENTO DE QGBT",
  descricaoServicoSecao: "Base histórica: ~R$ 23.400 (200 A/80 kW + autotrafo) a ~R$ 32.700 (350 A, com NF).",
  camposServico: [
    { name: "especificacao", label: "Especificação (A / V)", type: "text", width: "third", placeholder: "Ex.: 350 A / 380 V IP55" },
    { name: "qtdQuadros", label: "Nº de quadros", type: "number", width: "third", defaultValue: 1 },
    moeda("valorQuadro", "Valor por quadro (R$)", 25000, `Montado, identificado e testado. Sugestão ${hint(25000)}.`),
  ],
  zodServico: {
    especificacao: z.string().optional().default(""),
    qtdQuadros: z.coerce.number().int().min(1).default(1),
    valorQuadro: moedaZod,
  },
  montarItens: (f): ItemProposta[] => {
    const qtd = Number(f.qtdQuadros) || 1;
    const esp = String(f.especificacao ?? "").trim();
    return [{
      descricao: `Fornecimento de ${qtd > 1 ? `${qtd} QGBTs` : "QGBT"}${esp ? ` (${esp})` : ""} montado(s), identificado(s) e testado(s) em bancada, conforme especificação`,
      valor: num(f.valorQuadro) * qtd,
      condicao: "50% na contratação e 50% na entrega",
    }];
  },
  objetoPadrao:
    "Fornecimento de Quadro Geral de Baixa Tensão (QGBT) montado, identificado e testado em bancada, conforme especificação técnica do cliente.",
  observacoesPadrao: [
    "Montagem conforme a ABNT NBR IEC 61439.",
    "Prazo de entrega condicionado ao fornecimento dos componentes.",
  ],
  prazoPadrao: "20 a 30 dias",
});

// --------------------------------------------------------------- Limpeza de placas

export const limpezaPlacasService = criarServicoCpq({
  key: "limpeza",
  label: "Limpeza de Placas Solares",
  description: "Limpeza de módulos fotovoltaicos com inspeção e relatório, por nº de placas.",
  icon: "🧽",
  referencePrefix: "LIMPEZA",
  titulo: () => "PROPOSTA TÉCNICA E COMERCIAL — LIMPEZA DE PLACAS FOTOVOLTAICAS",
  descricaoServicoSecao: "Base histórica por placa: ~R$ 50 (poucas placas) · ~R$ 24,50 (≈100) · ~R$ 4–10 (usinas com milhares). Ajuste o valor/placa conforme o volume.",
  camposServico: [
    { name: "qtdPlacas", label: "Nº de placas", type: "number", required: true, width: "third", placeholder: "Ex.: 94" },
    moeda("valorPorPlaca", "Valor por placa (R$)", 25, `Sugestão ${hint(25)}/placa — reduza para grandes volumes.`),
    { name: "valorMinimo", label: "Valor mínimo (R$)", type: "currency", width: "third", defaultValue: "900", help: "Piso da visita, independentemente do nº de placas." },
  ],
  zodServico: {
    qtdPlacas: z.coerce.number().int().min(1),
    valorPorPlaca: moedaZod,
    valorMinimo: z.string().optional().default("0"),
  },
  montarItens: (f): ItemProposta[] => {
    const n = Number(f.qtdPlacas) || 0;
    const calc = num(f.valorPorPlaca) * n;
    const valor = Math.max(calc, num(f.valorMinimo));
    return [{
      descricao: `Limpeza de ${n} ${n > 1 ? "painéis" : "painel"} fotovoltaico(s), com inspeção prévia e relatório fotográfico`,
      valor,
      condicao: "",
    }];
  },
  objetoPadrao:
    "Limpeza técnica de módulos fotovoltaicos, com inspeção prévia, procedimento de segurança (NR-10/NR-35) e relatório fotográfico do antes e depois.",
  observacoesPadrao: [
    "Acesso especial (plataformas/andaimes), quando necessário, é orçado à parte.",
    "Serviço executado com equipe e equipamentos de segurança conforme NR-10 e NR-35.",
  ],
  prazoPadrao: "A combinar conforme agenda",
});

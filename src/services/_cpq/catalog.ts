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

// Execução de Subestação tem configurador próprio (custo × Fator K):
// ver src/services/execucao-subestacao.

// SPDA e Gerenciamento de Risco tem configurador próprio (preço por bloco +
// por m², com piso e painel de margem): ver src/services/spda.

// --------------------------------------------------------------- Laudo / Inspeção

export const laudoInspecaoService = criarServicoCpq({
  key: "laudo-inspecao",
  label: "Laudo e Inspeção Técnica",
  description: "Vistoria, laudo e ART (instalações, SPDA, iluminação de emergência) por edificação/torre.",
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

// Rede de Distribuição MT/BT tem configurador próprio (projeto por métrica +
// execução por custo × Fator K): ver src/services/rede-mt.

// --------------------------------------------------------------- Projeto elétrico BT

export const projetoEletricoBtService = criarServicoCpq({
  key: "projeto-bt",
  label: "Projeto Elétrico (BT)",
  description: "Projeto elétrico predial/industrial de baixa tensão (força, iluminação, dados).",
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

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

// Laudo e Inspeção Técnica tem configurador próprio (preço por unidade):
// ver src/services/laudo-inspecao.

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

// Fornecimento de QGBT tem configurador próprio (custo × Fator K):
// ver src/services/qgbt.

// Limpeza de Placas Solares tem configurador próprio (preço por placa, com
// piso mínimo): ver src/services/limpeza.

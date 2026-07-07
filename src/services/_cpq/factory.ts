import { z } from "zod";
import type { FieldDef, ServiceModule } from "../types";
import { identFields, identZod, naoVazio } from "../_shared";
import { mapPropostaPadrao, TEMPLATE_SERVICOS, type ItemProposta } from "./proposta";
import { parseNumber } from "@/lib/format";

/**
 * Fábrica dos serviços CPQ de engenharia elétrica.
 *
 * Cada serviço declara: campos próprios (as variáveis de precificação), a regra
 * `montarItens` (que aplica a tabela histórica/regra fixa e respeita overrides
 * do orçamentista) e textos padrão. A fábrica monta o ServiceModule completo:
 * formulário (identificação + serviço + itens extras + textos), validação e o
 * mapeamento para o molde padrão (template-servicos.docx).
 *
 * Os preços sugeridos vêm da análise das propostas reais da GTA (2024-2026) —
 * ver scripts de extração e a planilha consolidada da expansão CPQ.
 */

export interface CpqConfig {
  key: string;
  label: string;
  description: string;
  icon: string;
  referencePrefix: string;
  validityDays?: number;
  /** Título do documento (pode usar os campos do form) */
  titulo: (form: Record<string, unknown>) => string;
  /** Campos específicos do serviço (variáveis de precificação) */
  camposServico: FieldDef[];
  /** Validação dos campos específicos */
  zodServico: z.ZodRawShape;
  /** Regra de precificação: variáveis -> itens do escopo */
  montarItens: (form: Record<string, unknown>) => ItemProposta[];
  objetoPadrao: string;
  observacoesPadrao: string[];
  prazoPadrao: string;
  descricaoServicoSecao?: string;
  /** Marca o serviço como "em desenvolvimento" (selo no card + aviso na tela). */
  emDesenvolvimento?: boolean;
}

/** Linhas extras digitadas pelo orçamentista (escopo adicional). */
function itensExtras(form: Record<string, unknown>): ItemProposta[] {
  const raw = form.itensExtras;
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((r) => r && typeof r === "object" && String((r as Record<string, unknown>).descricao ?? "").trim())
    .map((r) => {
      const o = r as Record<string, unknown>;
      return {
        descricao: String(o.descricao),
        valor: parseNumber(o.valor ?? 0) || null,
        condicao: String(o.condicao ?? ""),
      };
    });
}

export function criarServicoCpq(cfg: CpqConfig): ServiceModule {
  const validade = cfg.validityDays ?? 20;

  const schema = z.object({
    ...identZod,
    localAtividade: z.string().optional().default(""),
    ...cfg.zodServico,
    itensExtras: z
      .array(z.object({ descricao: z.string(), valor: z.string(), condicao: z.string() }))
      .optional()
      .default([]),
    objeto: naoVazio("Informe o objeto"),
    observacoes: z.string().optional().default(""),
    prazoExecucao: naoVazio("Informe o prazo"),
  });

  return {
    key: cfg.key,
    label: cfg.label,
    description: cfg.description,
    icon: cfg.icon,
    referencePrefix: cfg.referencePrefix,
    validityDays: validade,
    // Serviços genéricos do CPQ ainda não estão no padrão completo. Ao virarem
    // configurador próprio (como Solar/SPDA), saem da fábrica e perdem o selo.
    emDesenvolvimento: cfg.emDesenvolvimento ?? true,
    templateFile: TEMPLATE_SERVICOS,
    formSchema: {
      sections: [
        { title: "Identificação", fields: identFields({ validadeDias: validade }) },
        {
          title: "Serviço e precificação",
          description: cfg.descricaoServicoSecao,
          fields: [
            { name: "localAtividade", label: "Local da atividade", type: "text", width: "half", placeholder: "Ex.: Anápolis/GO — DAIA" },
            ...cfg.camposServico,
          ],
        },
        {
          title: "Itens adicionais (opcional)",
          description: "Linhas extras de escopo com valor próprio — entram na tabela e no total.",
          fields: [
            {
              name: "itensExtras",
              label: "Itens extras",
              type: "array",
              addLabel: "Adicionar item",
              itemFields: [
                { name: "descricao", label: "Descrição", type: "text" },
                { name: "valor", label: "Valor (R$)", type: "text", width: "third" },
                { name: "condicao", label: "Condição de pagamento", type: "text" },
              ],
            },
          ],
        },
        {
          title: "Textos da proposta",
          fields: [
            { name: "objeto", label: "Objeto", type: "textarea", required: true, width: "full", defaultValue: cfg.objetoPadrao },
            { name: "observacoes", label: "Condições gerais (uma por linha)", type: "textarea", width: "full", defaultValue: cfg.observacoesPadrao.join("\n") },
            { name: "prazoExecucao", label: "Prazo de execução", type: "text", required: true, width: "half", defaultValue: cfg.prazoPadrao },
          ],
        },
      ],
    },
    zodSchema: schema,
    map: (formData) => {
      const f = formData as Record<string, unknown> & { objeto: string; observacoes?: string; prazoExecucao: string };
      const itens = [...cfg.montarItens(f), ...itensExtras(f)];
      return mapPropostaPadrao({
        ...(f as unknown as Parameters<typeof mapPropostaPadrao>[0]),
        referencePrefix: cfg.referencePrefix,
        titulo: cfg.titulo(f),
        objeto: f.objeto,
        localAtividade: String(f.localAtividade ?? ""),
        itens,
        observacoes: String(f.observacoes ?? "").split("\n"),
        prazoExecucao: f.prazoExecucao,
      });
    },
  };
}

/** Formata R$ para textos de ajuda ("média histórica: R$ 6.000"). */
export const hint = (v: number) => "R$ " + v.toLocaleString("pt-BR");

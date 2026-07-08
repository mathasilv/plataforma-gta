import { z } from "zod";

/** Modelo e validação do fluxo de Aprovação de Orçamentos. */

export const ESTACOES = [
  { value: "rascunho", label: "Rascunho" },
  { value: "em_revisao", label: "Em revisão" },
  { value: "aprovado", label: "Aprovado" },
  { value: "cancelado", label: "Cancelado" },
] as const;
export type Estacao = (typeof ESTACOES)[number]["value"];

export function estacaoLabel(e: Estacao): string {
  return ESTACOES.find((x) => x.value === e)?.label ?? e;
}

export type FonteOrcamento = "interno" | "externo";
export type NivelValidacao = "ok" | "alerta" | "bloqueio"; // ✅ ⚠️ ❌
export type AcaoTransicao = "enviar" | "aprovar" | "rejeitar" | "cancelar";

/** Comentário de revisão (rastro "Fulano comentou que precisa editar X"). */
export interface ComentarioOrcamento {
  id: string;
  autor: string; // nome/e-mail — vem da sessão
  texto: string;
  em: string; // ISO
}

/** Entrada do histórico do fluxo de aprovação (decisões humanas e checagens automáticas). */
export interface RegistroValidacao {
  id: string;
  estacao: Estacao;
  /** Ação humana ou "auto" (motor de regras, Fase 3). */
  tipo: AcaoTransicao | "auto";
  nivel?: NivelValidacao;
  mensagem: string;
  autor: string; // nome/e-mail; "sistema" para auto
  em: string; // ISO
}

/** Ficha leve preenchida pelo revisor para orçamentos EXTERNOS. */
export interface FichaExterna {
  custoBase: number;
  fator: number;
  faturamento: number;
  impostosPct: number; // 0..1
  margemLiquida: number; // 0..1 (informada/calculada)
  observacoes?: string;
}

export interface Orcamento {
  id: string;
  referencia: string; // GTA-ANO-CLIENTE-ORC-00N
  cliente: string;
  fonte: FonteOrcamento;
  estacao: Estacao;
  serviceKey: string; // preenchido quando interno
  propostaId?: string; // vínculo quando interno
  descricao: string;
  valor?: number; // valor total do orçamento (exibição/dashboard)
  ficha?: FichaExterna; // quando externo
  comentarios: ComentarioOrcamento[];
  historico: RegistroValidacao[];
  parecer?: string; // último parecer do aprovador
  decididoPor?: string; // nome/e-mail de quem aprovou/rejeitou/cancelou
  decididoEm?: string; // ISO
  /** Retenção do anexo (Fase 2): data em que os arquivos podem ser apagados. */
  expiraEm?: string | null;
  criadoPor: string;
  criadoPorNome?: string;
  criadoEm: string;
  atualizadoEm: string;
}

// ------------------------------------------------------------------ Zod

export const fichaExternaSchema = z.object({
  custoBase: z.number().nonnegative(),
  fator: z.number().positive(),
  faturamento: z.number().positive(),
  impostosPct: z.number().min(0).max(1),
  margemLiquida: z.number().min(-1).max(1),
  observacoes: z.string().trim().max(2000).optional(),
});

export const criarOrcamentoSchema = z
  .object({
    cliente: z.string().trim().min(1, "Informe o cliente").max(200),
    fonte: z.enum(["interno", "externo"]),
    serviceKey: z.string().trim().max(60).default(""),
    propostaId: z.string().uuid().optional(),
    descricao: z.string().trim().max(2000).default(""),
    valor: z.number().nonnegative().optional(),
    ficha: fichaExternaSchema.optional(),
  })
  .refine((d) => d.fonte !== "externo" || d.ficha !== undefined, {
    message: "Orçamento externo exige a ficha preenchida.",
    path: ["ficha"],
  });

export const atualizarOrcamentoSchema = z.object({
  cliente: z.string().trim().min(1).max(200).optional(),
  descricao: z.string().trim().max(2000).optional(),
  valor: z.number().nonnegative().optional(),
  ficha: fichaExternaSchema.optional(),
});

export const transicaoSchema = z
  .object({
    acao: z.enum(["enviar", "aprovar", "rejeitar", "cancelar"]),
    parecer: z.string().trim().max(2000).optional(),
  })
  .refine((d) => (d.acao !== "aprovar" && d.acao !== "rejeitar") || !!d.parecer?.trim(), {
    message: "Informe o parecer da revisão.",
    path: ["parecer"],
  });

export const comentarioSchema = z.object({
  texto: z.string().trim().min(1, "Escreva o comentário").max(2000),
});

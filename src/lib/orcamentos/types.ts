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

export type AnexoTipo = "pdf" | "planilha";

/** Referência a um arquivo anexado (PDF ou planilha), guardado no Blob ou fs local. */
export interface AnexoRef {
  id: string;
  nome: string; // nome original do arquivo
  tipo: AnexoTipo;
  contentType: string;
  tamanho: number; // bytes
  /** URL do Vercel Blob (prod) OU chave local (dev). O download passa pela nossa rota. */
  url: string;
  /** true = armazenado no Vercel Blob; false = filesystem local (dev). */
  blob: boolean;
  enviadoPor: string;
  em: string; // ISO
}

/**
 * Limite por anexo: 4 MB. O upload trafega pelo route handler e o corpo de uma
 * Vercel Function é limitado a ~4,5 MB — por isso 4 MB (com folga para o overhead
 * do multipart). Arquivos maiores exigiriam client-upload direto ao Blob (futuro).
 */
export const ANEXO_MAX_BYTES = 4 * 1024 * 1024;
/** Teto de anexos por orçamento (evita abuso de armazenamento). */
export const ANEXO_MAX_QTD = 20;

export const ANEXO_CONTENT_TYPES: Record<string, AnexoTipo> = {
  "application/pdf": "pdf",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "planilha", // .xlsx
  "application/vnd.ms-excel": "planilha", // .xls
  "text/csv": "planilha",
};
const ANEXO_EXTENSOES: Record<AnexoTipo, string[]> = {
  pdf: [".pdf"],
  planilha: [".xlsx", ".xls", ".csv"],
};

export function anexoTipoDoContentType(ct: string): AnexoTipo | null {
  return ANEXO_CONTENT_TYPES[ct] ?? null;
}

/** Nome seguro para exibição/download (sem caminho, sem controle, limitado). */
export function sanitizarNomeAnexo(nome: string): string {
  const base = nome.split(/[\\/]/).pop() ?? nome;
  // remove caracteres de controle (evita quebrar headers/exibição)
  return [...base].filter((c) => c >= " " && c !== "\x7f").join("").trim().slice(0, 200) || "arquivo";
}

/**
 * Defesa além do content-type declarado (que vem do cliente): confere a extensão
 * e os "magic bytes" do arquivo contra o tipo. CSV é texto, sem assinatura → aceito
 * pela extensão.
 */
export function conteudoBateComTipo(tipo: AnexoTipo, nome: string, buf: Uint8Array): boolean {
  const i = nome.lastIndexOf(".");
  const ext = i >= 0 ? nome.slice(i).toLowerCase() : "";
  if (!ANEXO_EXTENSOES[tipo].includes(ext)) return false;
  const comeca = (sig: number[]) => sig.every((v, k) => buf[k] === v);
  if (tipo === "pdf") return comeca([0x25, 0x50, 0x44, 0x46]); // %PDF
  if (ext === ".xlsx") return comeca([0x50, 0x4b, 0x03, 0x04]); // zip (PK\x03\x04)
  if (ext === ".xls") return comeca([0xd0, 0xcf, 0x11, 0xe0]); // OLE compound
  return true; // .csv
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
  anexos: AnexoRef[];
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

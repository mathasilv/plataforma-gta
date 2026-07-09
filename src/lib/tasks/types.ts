import { z } from "zod";

/** Modelo e validação do módulo de Tarefas. */

export const STATUS_TAREFA = [
  { value: "afazer", label: "A Fazer" },
  { value: "andamento", label: "Em Andamento" },
  { value: "concluida", label: "Concluída" },
] as const;

export const PRIORIDADES = [
  { value: "baixa", label: "Baixa" },
  { value: "media", label: "Média" },
  { value: "alta", label: "Alta" },
] as const;

export type StatusTarefa = (typeof STATUS_TAREFA)[number]["value"];
export type Prioridade = (typeof PRIORIDADES)[number]["value"];

export interface Comentario {
  id: string;
  /** Nome (ou e-mail) de quem comentou — vem da sessão, não do cliente. */
  autor: string;
  texto: string;
  /** ISO datetime */
  em: string;
}

export interface Task {
  id: string;
  titulo: string;
  descricao: string;
  /** Cliente/obra relacionada à tarefa (texto livre). */
  cliente: string;
  /** De onde veio a demanda (quem solicitou) — texto livre. */
  demandante: string;
  /** E-mail do responsável (usuário cadastrado na plataforma). */
  responsavel: string;
  status: StatusTarefa;
  prioridade: Prioridade;
  /** yyyy-mm-dd (opcional) */
  prazo: string;
  comentarios: Comentario[];
  criadoPor: string;
  criadoEm: string;
  atualizadoEm: string;
}

const statusEnum = z.enum(["afazer", "andamento", "concluida"]);
const prioridadeEnum = z.enum(["baixa", "media", "alta"]);

/** Verifica se yyyy-mm-dd é uma data real do calendário (rejeita 2026-02-31). */
function isDataReal(s: string): boolean {
  const [y, m, d] = s.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

/** Prazo: yyyy-mm-dd válido no calendário, ou vazio. */
const prazoSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida")
  .refine(isDataReal, "Data inexistente")
  .or(z.literal(""))
  .default("");

/** Payload de criação de tarefa. */
export const createTaskSchema = z.object({
  titulo: z.string().trim().min(1, "Informe o título").max(300),
  descricao: z.string().trim().max(4000).default(""),
  cliente: z.string().trim().max(200).default(""),
  demandante: z.string().trim().max(200).default(""),
  responsavel: z.string().trim().min(1, "Informe o responsável"),
  status: statusEnum.default("afazer"),
  prioridade: prioridadeEnum.default("media"),
  prazo: prazoSchema,
});

/** Payload de atualização parcial. */
export const updateTaskSchema = createTaskSchema.partial();

/** Payload de novo comentário. */
export const createComentarioSchema = z.object({
  texto: z.string().trim().min(1, "Escreva o comentário").max(2000),
});

export function statusLabel(s: StatusTarefa): string {
  return STATUS_TAREFA.find((x) => x.value === s)?.label ?? s;
}

export function prioridadeLabel(p: Prioridade): string {
  return PRIORIDADES.find((x) => x.value === p)?.label ?? p;
}

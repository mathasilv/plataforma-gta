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

/** Payload de criação de tarefa. */
export const createTaskSchema = z.object({
  titulo: z.string().trim().min(1, "Informe o título").max(200),
  descricao: z.string().trim().max(4000).default(""),
  responsavel: z.string().trim().min(1, "Informe o responsável"),
  status: statusEnum.default("afazer"),
  prioridade: prioridadeEnum.default("media"),
  prazo: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida")
    .or(z.literal(""))
    .default(""),
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

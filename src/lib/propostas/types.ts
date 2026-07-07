import { z } from "zod";

/** Modelo e validação de Propostas salvas (histórico / rascunhos). */

export const STATUS_PROPOSTA = [
  { value: "rascunho", label: "Rascunho" },
  { value: "precificada", label: "Precificada" },
  { value: "gerada", label: "Gerada" },
] as const;

export type StatusProposta = (typeof STATUS_PROPOSTA)[number]["value"];

export interface Proposta {
  id: string;
  serviceKey: string; // "solar"
  cliente: string;
  referencia: string;
  status: StatusProposta;
  /** Configuração completa (entradas + resultados) para reabrir e continuar. */
  dados: Record<string, unknown>;
  criadoPor: string;
  criadoEm: string;
  atualizadoEm: string;
}

export const createPropostaSchema = z.object({
  serviceKey: z.string().trim().min(1),
  cliente: z.string().trim().min(1, "Informe o cliente").max(200),
  referencia: z.string().trim().max(120).default(""),
  status: z.enum(["rascunho", "precificada", "gerada"]).default("rascunho"),
  dados: z.record(z.unknown()).default({}),
});

export const updatePropostaSchema = createPropostaSchema.partial();

export function statusPropostaLabel(s: StatusProposta): string {
  return STATUS_PROPOSTA.find((x) => x.value === s)?.label ?? s;
}

import { z } from "zod";

/** Modelo e validação do cadastro de Clientes. */

export type TipoPessoa = "PF" | "PJ";

/** Segmentos usados pela GTA (engenharia elétrica). "Outro" cobre o resto. */
export const SEGMENTOS = [
  "Residencial",
  "Comercial",
  "Industrial",
  "Rural",
  "Construtora",
  "Órgão público",
  "Outro",
] as const;

/** Unidades federativas (para o select de UF). */
export const UFS = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG",
  "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
] as const;

export interface Cliente {
  id: string;
  nome: string; // nome / razão social
  tipoPessoa: TipoPessoa;
  documento: string; // CNPJ ou CPF (livre — formatação a critério do usuário)
  // Contato
  contatoNome: string;
  telefone: string; // telefone / WhatsApp
  email: string;
  // Endereço (usado no futuro para NF/contrato)
  cep: string;
  logradouro: string;
  numero: string;
  bairro: string;
  cidade: string;
  uf: string;
  // Classificação
  segmento: string;
  observacoes: string;
  criadoPor: string;
  criadoPorNome?: string; // resolvido do e-mail, só exibição
  criadoEm: string;
  atualizadoEm: string;
}

const opcional = (max: number) => z.string().trim().max(max).default("");

export const criarClienteSchema = z.object({
  nome: z.string().trim().min(1, "Informe o nome").max(200),
  tipoPessoa: z.enum(["PF", "PJ"]).default("PJ"),
  documento: opcional(20),
  contatoNome: opcional(200),
  telefone: opcional(40),
  email: opcional(200).refine(
    (v) => v === "" || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v),
    "E-mail inválido",
  ),
  cep: opcional(12),
  logradouro: opcional(200),
  numero: opcional(20),
  bairro: opcional(120),
  cidade: opcional(120),
  uf: opcional(2),
  segmento: opcional(40),
  observacoes: opcional(2000),
});

export const atualizarClienteSchema = criarClienteSchema.partial();

/** "Cidade/UF" no formato usado pelos configuradores (ex.: "Anápolis/GO"). */
export function cidadeUf(c: Pick<Cliente, "cidade" | "uf">): string {
  if (c.cidade && c.uf) return `${c.cidade}/${c.uf}`;
  return c.cidade || c.uf || "";
}

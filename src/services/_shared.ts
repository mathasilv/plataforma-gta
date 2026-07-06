import { z } from "zod";
import type { FieldDef } from "./types";
import {
  addDays,
  buildReference,
  capitalize,
  formatBRL,
  formatDateLong,
  formatDateShort,
  moneyToWords,
  parseNumber,
} from "@/lib/format";

/**
 * Blocos compartilhados entre serviços: campos de identificação, fragmento Zod
 * e cálculo dos marcadores comuns (referência, datas, cliente).
 */

export const naoVazio = (msg: string) => z.string().min(1, msg);

/** Campos padrão da seção Identificação (cada serviço acrescenta os seus). */
export function identFields(opts: {
  validadeDias: number;
  formaPagamento?: string;
}): FieldDef[] {
  return [
    { name: "clienteNome", label: "Nome do cliente", type: "text", required: true, width: "half", placeholder: "Ex.: Residencial Espanha" },
    { name: "clienteSigla", label: "Sigla do cliente (p/ referência)", type: "text", width: "half", placeholder: "Ex.: RESPANHA", help: "Opcional — usada no código GTA-ANO-SIGLA-SERVIÇO-00N." },
    { name: "cidadeUf", label: "Cidade/UF", type: "text", required: true, width: "third", placeholder: "Ex.: Anápolis/GO" },
    { name: "referenciaSeq", label: "Nº sequencial", type: "number", required: true, width: "third", defaultValue: 1 },
    { name: "dataEmissao", label: "Data de emissão", type: "date", required: true, width: "third" },
    { name: "validadeDias", label: "Validade (dias)", type: "number", required: true, width: "third", defaultValue: opts.validadeDias },
    { name: "formaPagamento", label: "Forma de pagamento", type: "text", required: true, width: "full", defaultValue: opts.formaPagamento ?? "A Combinar" },
  ];
}

/** Fragmento Zod dos campos de identificação. */
export const identZod = {
  clienteNome: naoVazio("Informe o nome do cliente"),
  clienteSigla: z.string().optional().default(""),
  cidadeUf: naoVazio("Informe a cidade/UF"),
  referenciaSeq: z.coerce.number().int().min(1).default(1),
  dataEmissao: naoVazio("Informe a data de emissão"),
  validadeDias: z.coerce.number().int().min(1),
  formaPagamento: naoVazio("Informe a forma de pagamento"),
};

export interface IdentForm {
  clienteNome: string;
  clienteSigla?: string;
  cidadeUf: string;
  referenciaSeq: number;
  dataEmissao: string;
  validadeDias: number;
  formaPagamento: string;
}

/** Marcadores comuns calculados a partir da identificação. */
export function identData(form: IdentForm, referencePrefix: string) {
  const emissao = new Date(`${form.dataEmissao}T12:00:00`);
  const ano = emissao.getFullYear();
  return {
    clienteNome: form.clienteNome,
    clienteNomeUpper: form.clienteNome.toUpperCase(),
    cidadeUf: form.cidadeUf,
    referencia: buildReference(
      referencePrefix,
      form.clienteSigla?.trim() || form.clienteNome,
      form.referenciaSeq,
      ano,
    ),
    dataEmissao: formatDateLong(emissao),
    validade: `${formatDateShort(addDays(emissao, form.validadeDias))} (${form.validadeDias} dias corridos)`,
    formaPagamento: form.formaPagamento,
  };
}

/** Valor em R$ formatado + por extenso capitalizado com ponto final. */
export function money(value: unknown) {
  const n = parseNumber(value);
  return { n, fmt: formatBRL(n), extenso: capitalize(moneyToWords(n)) + "." };
}

/** Campo array de cronograma (etapa/prazo/responsável) com linhas padrão. */
export function cronogramaField(
  defaults: Array<{ etapa: string; prazo: string; responsavel: string }>,
): FieldDef {
  return {
    name: "cronograma",
    label: "Etapas do cronograma",
    type: "array",
    addLabel: "Adicionar etapa",
    defaultRows: defaults.map((d) => ({ defaults: d })),
    itemFields: [
      { name: "etapa", label: "Etapa", type: "text" },
      { name: "prazo", label: "Prazo", type: "text" },
      { name: "responsavel", label: "Responsável", type: "text" },
    ],
  };
}

export const cronogramaZod = z
  .array(z.object({ etapa: z.string(), prazo: z.string(), responsavel: z.string() }))
  .min(1);

/** Divide um nome longo em 2 linhas para o bloco de aceite (limite ~32 chars). */
export function splitAceite(nomeUpper: string): { linha1: string; linha2: string } {
  if (nomeUpper.length <= 32) return { linha1: nomeUpper, linha2: "" };
  const cut = nomeUpper.lastIndexOf(" ", 32);
  if (cut <= 0) return { linha1: nomeUpper, linha2: "" };
  return { linha1: nomeUpper.slice(0, cut), linha2: nomeUpper.slice(cut + 1) };
}

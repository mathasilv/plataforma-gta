import type { MapResult } from "../types";
import { identData, money, type IdentForm } from "../_shared";
import { formatBRL } from "@/lib/format";

/**
 * Núcleo CPQ dos serviços de engenharia: transforma itens de escopo precificados
 * no formato do molde padrão (src/services/_shared/template-servicos.docx).
 *
 * Padrão observado nas propostas reais da GTA: escopo em itens numerados, cada
 * um com valor e condição de pagamento própria, total ao final. O preço de cada
 * item vem da lógica do serviço (média histórica, tabela por variável ou regra
 * fixa) e o orçamentista pode sobrescrever no formulário.
 */

export const TEMPLATE_SERVICOS = "src/services/_shared/template-servicos.docx";

export interface ItemProposta {
  descricao: string;
  /** Valor em R$; null/0 = "Incluso" (sem preço destacado) */
  valor: number | null;
  condicao?: string;
}

export interface PropostaPadraoInput extends IdentForm {
  titulo: string; // ex.: "PROPOSTA TÉCNICA E COMERCIAL — PROJETO DE SUBESTAÇÃO 300 kVA"
  objeto: string;
  localAtividade?: string;
  itens: ItemProposta[];
  observacoes: string[];
  prazoExecucao: string;
  referencePrefix: string;
}

export function mapPropostaPadrao(i: PropostaPadraoInput): MapResult {
  const ident = identData(i, i.referencePrefix);
  const total = i.itens.reduce((s, it) => s + (it.valor ?? 0), 0);
  const m = money(total);

  return {
    data: {
      tituloProposta: i.titulo,
      referencia: ident.referencia,
      clienteNome: ident.clienteNome,
      localAtividade: i.localAtividade?.trim() || i.cidadeUf,
      dataEmissao: ident.dataEmissao,
      validade: ident.validade,
      objeto: i.objeto,
      itens: i.itens.map((it, idx) => ({
        num: idx + 1,
        descricao: it.descricao,
        valor: it.valor ? formatBRL(it.valor) : "Incluso no escopo",
        condicao: it.condicao?.trim() || "",
      })),
      valorTotal: m.fmt,
      valorTotalExtenso: m.extenso,
      observacoes: i.observacoes.filter((t) => t.trim()).map((texto) => ({ texto })),
      formaPagamento: ident.formaPagamento,
      prazoExecucao: i.prazoExecucao,
      clienteNomeUpper: ident.clienteNomeUpper,
      cidadeUf: ident.cidadeUf,
    },
  };
}

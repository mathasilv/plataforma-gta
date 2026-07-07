import { z } from "zod";
import type { ServiceModule } from "../types";
import { identZod, naoVazio } from "../_shared";
import { mapPropostaPadrao } from "../_cpq/proposta";
import { parseNumber } from "@/lib/format";

/**
 * Fornecimento de QGBT — configurador próprio: precifica por custo × Fator K
 * (produto manufaturado). O QgbtConfigurator monta os itens já precificados e
 * envia este formData; o .docx usa o molde padrão.
 */

const itemSchema = z.object({
  descricao: z.string().min(1),
  valor: z.string().default("0"),
  condicao: z.string().optional().default(""),
});

const qgbtZod = z.object({
  ...identZod,
  localAtividade: z.string().optional().default(""),
  titulo: naoVazio("Informe o título"),
  objeto: naoVazio("Informe o objeto"),
  prazoExecucao: naoVazio("Informe o prazo"),
  itens: z.array(itemSchema).min(1, "Ao menos um item de escopo"),
  observacoes: z.array(z.string()).optional().default([]),
});

type QgbtForm = z.infer<typeof qgbtZod>;

export const qgbtService: ServiceModule = {
  key: "qgbt",
  label: "Fornecimento de QGBT",
  description: "Quadro Geral de Baixa Tensão montado e testado — preço por custo × Fator K.",
  referencePrefix: "QGBT",
  validityDays: 20,
  usesConfigurator: true,
  templateFile: "src/services/_shared/template-servicos.docx",
  formSchema: { sections: [] },
  zodSchema: qgbtZod,
  map: (formData) => {
    const f = formData as QgbtForm;
    return mapPropostaPadrao({
      clienteNome: f.clienteNome,
      cidadeUf: f.cidadeUf,
      referenciaSeq: f.referenciaSeq,
      dataEmissao: f.dataEmissao,
      validadeDias: f.validadeDias,
      formaPagamento: f.formaPagamento,
      referencePrefix: "QGBT",
      titulo: f.titulo,
      objeto: f.objeto,
      localAtividade: f.localAtividade,
      itens: f.itens.map((it) => ({ descricao: it.descricao, valor: parseNumber(it.valor) || null, condicao: it.condicao })),
      observacoes: f.observacoes ?? [],
      prazoExecucao: f.prazoExecucao,
    });
  },
};

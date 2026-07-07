import { z } from "zod";
import type { ServiceModule } from "../types";
import { identZod, naoVazio } from "../_shared";
import { mapPropostaPadrao, TEMPLATE_SERVICOS } from "./proposta";
import { parseNumber } from "@/lib/format";

/**
 * Fábrica de ServiceModule para serviços com CONFIGURADOR próprio que reusam o
 * molde padrão (solar-style). O configurador (client) monta os `itens` já
 * precificados e envia; aqui só validamos e mapeamos. Reduz a repetição dos
 * index.ts (execução SE, SPDA, rede MT, QGBT, e os serviços simples).
 */

const itemSchema = z.object({
  descricao: z.string().min(1),
  valor: z.string().default("0"),
  condicao: z.string().optional().default(""),
});

export function criarServicoConfigurador(cfg: {
  key: string;
  label: string;
  description: string;
  referencePrefix: string;
  validityDays?: number;
}): ServiceModule {
  const zodSchema = z.object({
    ...identZod,
    localAtividade: z.string().optional().default(""),
    titulo: naoVazio("Informe o título"),
    objeto: naoVazio("Informe o objeto"),
    prazoExecucao: naoVazio("Informe o prazo"),
    itens: z.array(itemSchema).min(1, "Ao menos um item de escopo"),
    observacoes: z.array(z.string()).optional().default([]),
  });
  type Form = z.infer<typeof zodSchema>;

  return {
    key: cfg.key,
    label: cfg.label,
    description: cfg.description,
    referencePrefix: cfg.referencePrefix,
    validityDays: cfg.validityDays ?? 20,
    usesConfigurator: true,
    templateFile: TEMPLATE_SERVICOS,
    formSchema: { sections: [] },
    zodSchema,
    map: (formData) => {
      const f = formData as Form;
      return mapPropostaPadrao({
        clienteNome: f.clienteNome,
        cidadeUf: f.cidadeUf,
        referenciaSeq: f.referenciaSeq,
        dataEmissao: f.dataEmissao,
        validadeDias: f.validadeDias,
        formaPagamento: f.formaPagamento,
        referencePrefix: cfg.referencePrefix,
        titulo: f.titulo,
        objeto: f.objeto,
        localAtividade: f.localAtividade,
        itens: f.itens.map((it) => ({ descricao: it.descricao, valor: parseNumber(it.valor) || null, condicao: it.condicao })),
        observacoes: f.observacoes ?? [],
        prazoExecucao: f.prazoExecucao,
      });
    },
  };
}

import { z } from "zod";
import type { ServiceModule } from "../types";
import { identZod, naoVazio } from "../_shared";
import { mapPropostaPadrao } from "../_cpq/proposta";
import { parseNumber } from "@/lib/format";

/**
 * SPDA e Gerenciamento de Risco (ABNT NBR 5419) — serviço com configurador
 * próprio: precifica o projeto pelas métricas reais da GTA (risco por bloco +
 * projeto por m², com piso mínimo). O SpdaConfigurator monta os itens já
 * precificados e envia este formData; a geração do .docx reusa o molde padrão.
 */

const itemSchema = z.object({
  descricao: z.string().min(1),
  valor: z.string().default("0"),
  condicao: z.string().optional().default(""),
});

const spdaZod = z.object({
  ...identZod,
  localAtividade: z.string().optional().default(""),
  titulo: naoVazio("Informe o título"),
  objeto: naoVazio("Informe o objeto"),
  prazoExecucao: naoVazio("Informe o prazo"),
  itens: z.array(itemSchema).min(1, "Ao menos um item de escopo"),
  observacoes: z.array(z.string()).optional().default([]),
});

type SpdaForm = z.infer<typeof spdaZod>;

export const spdaService: ServiceModule = {
  key: "spda",
  label: "SPDA e Gerenciamento de Risco",
  description: "Precifica o projeto por bloco (risco) e por m² (projeto) conforme a ABNT NBR 5419.",
  referencePrefix: "SPDA",
  validityDays: 20,
  usesConfigurator: true,
  templateFile: "src/services/_shared/template-servicos.docx",
  formSchema: { sections: [] },
  zodSchema: spdaZod,
  map: (formData) => {
    const f = formData as SpdaForm;
    return mapPropostaPadrao({
      clienteNome: f.clienteNome,
      cidadeUf: f.cidadeUf,
      referenciaSeq: f.referenciaSeq,
      dataEmissao: f.dataEmissao,
      validadeDias: f.validadeDias,
      formaPagamento: f.formaPagamento,
      referencePrefix: "SPDA",
      titulo: f.titulo,
      objeto: f.objeto,
      localAtividade: f.localAtividade,
      itens: f.itens.map((it) => ({ descricao: it.descricao, valor: parseNumber(it.valor) || null, condicao: it.condicao })),
      observacoes: f.observacoes ?? [],
      prazoExecucao: f.prazoExecucao,
    });
  },
};

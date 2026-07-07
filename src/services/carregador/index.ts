import { z } from "zod";
import type { ServiceModule } from "../types";
import { identZod, naoVazio } from "../_shared";
import { mapPropostaPadrao } from "../_cpq/proposta";
import { parseNumber } from "@/lib/format";

/**
 * Carregador Veicular (EV) — serviço com configurador próprio (dimensionamento
 * NBR 5410 + lista de materiais + preço por custo). O CarregadorConfigurator
 * monta os itens já precificados e envia este formData; a geração do .docx
 * reusa o molde padrão dos serviços.
 */

const itemSchema = z.object({
  descricao: z.string().min(1),
  valor: z.string().default("0"),
  condicao: z.string().optional().default(""),
});

const carregadorZod = z.object({
  ...identZod,
  localAtividade: z.string().optional().default(""),
  titulo: naoVazio("Informe o título"),
  objeto: naoVazio("Informe o objeto"),
  prazoExecucao: naoVazio("Informe o prazo"),
  itens: z.array(itemSchema).min(1, "Ao menos um item de escopo"),
  observacoes: z.array(z.string()).optional().default([]),
});

type CarregadorForm = z.infer<typeof carregadorZod>;

export const carregadorService: ServiceModule = {
  key: "carregador",
  label: "Carregador Veicular (EV)",
  description: "Dimensiona a infraestrutura (NBR 5410), monta a lista de materiais e precifica.",
  icon: "🔋",
  referencePrefix: "EV",
  validityDays: 20,
  usesConfigurator: true,
  templateFile: "src/services/_shared/template-servicos.docx",
  formSchema: { sections: [] },
  zodSchema: carregadorZod,
  map: (formData) => {
    const f = formData as CarregadorForm;
    return mapPropostaPadrao({
      clienteNome: f.clienteNome,
      cidadeUf: f.cidadeUf,
      referenciaSeq: f.referenciaSeq,
      dataEmissao: f.dataEmissao,
      validadeDias: f.validadeDias,
      formaPagamento: f.formaPagamento,
      referencePrefix: "EV",
      titulo: f.titulo,
      objeto: f.objeto,
      localAtividade: f.localAtividade,
      itens: f.itens.map((it) => ({ descricao: it.descricao, valor: parseNumber(it.valor) || null, condicao: it.condicao })),
      observacoes: f.observacoes ?? [],
      prazoExecucao: f.prazoExecucao,
    });
  },
};

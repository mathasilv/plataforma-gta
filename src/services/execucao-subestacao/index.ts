import { z } from "zod";
import type { ServiceModule } from "../types";
import { identZod, naoVazio } from "../_shared";
import { mapPropostaPadrao } from "../_cpq/proposta";
import { parseNumber } from "@/lib/format";

/**
 * Execução de Subestação — serviço com configurador próprio: precifica por
 * custo × Fator K (modelo real da GTA). O ExecucaoSubestacaoConfigurator monta
 * os itens já precificados e envia este formData; o .docx usa o molde padrão.
 */

const itemSchema = z.object({
  descricao: z.string().min(1),
  valor: z.string().default("0"),
  condicao: z.string().optional().default(""),
});

const execSeZod = z.object({
  ...identZod,
  localAtividade: z.string().optional().default(""),
  titulo: naoVazio("Informe o título"),
  objeto: naoVazio("Informe o objeto"),
  prazoExecucao: naoVazio("Informe o prazo"),
  itens: z.array(itemSchema).min(1, "Ao menos um item de escopo"),
  observacoes: z.array(z.string()).optional().default([]),
});

type ExecSeForm = z.infer<typeof execSeZod>;

export const execucaoSubestacaoService: ServiceModule = {
  key: "execucao-subestacao",
  label: "Execução de Subestação",
  description: "Precifica a execução por custo × Fator K (equipamentos faturados à parte).",
  icon: "⚙️",
  referencePrefix: "EXECSE",
  validityDays: 20,
  usesConfigurator: true,
  templateFile: "src/services/_shared/template-servicos.docx",
  formSchema: { sections: [] },
  zodSchema: execSeZod,
  map: (formData) => {
    const f = formData as ExecSeForm;
    return mapPropostaPadrao({
      clienteNome: f.clienteNome,
      cidadeUf: f.cidadeUf,
      referenciaSeq: f.referenciaSeq,
      dataEmissao: f.dataEmissao,
      validadeDias: f.validadeDias,
      formaPagamento: f.formaPagamento,
      referencePrefix: "EXECSE",
      titulo: f.titulo,
      objeto: f.objeto,
      localAtividade: f.localAtividade,
      itens: f.itens.map((it) => ({ descricao: it.descricao, valor: parseNumber(it.valor) || null, condicao: it.condicao })),
      observacoes: f.observacoes ?? [],
      prazoExecucao: f.prazoExecucao,
    });
  },
};

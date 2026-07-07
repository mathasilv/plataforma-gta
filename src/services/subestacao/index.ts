import { z } from "zod";
import type { ServiceModule } from "../types";
import { identZod, naoVazio } from "../_shared";
import { mapPropostaPadrao } from "../_cpq/proposta";
import { parseNumber } from "@/lib/format";

/**
 * Projeto de Subestação — serviço com configurador próprio (dimensionamento
 * automático). O SubestacaoConfigurator calcula o transformador comercial,
 * correntes e proteção, monta os itens de escopo já precificados e envia este
 * formData. A geração do .docx reusa o molde padrão dos serviços.
 */

const itemSchema = z.object({
  descricao: z.string().min(1),
  valor: z.string().default("0"),
  condicao: z.string().optional().default(""),
});

const subestacaoZod = z.object({
  ...identZod,
  localAtividade: z.string().optional().default(""),
  titulo: naoVazio("Informe o título"),
  objeto: naoVazio("Informe o objeto"),
  prazoExecucao: naoVazio("Informe o prazo"),
  itens: z.array(itemSchema).min(1, "Ao menos um item de escopo"),
  observacoes: z.array(z.string()).optional().default([]),
});

type SubestacaoForm = z.infer<typeof subestacaoZod>;

// formSchema mínimo (não usado: a tela usa o configurador)
const formSchemaVazio = { sections: [] };

export const subestacaoService: ServiceModule = {
  key: "projeto-subestacao",
  label: "Projeto de Subestação",
  description: "Dimensiona o transformador e a proteção pela carga e gera a proposta do projeto.",
  referencePrefix: "PROJSE",
  validityDays: 20,
  usesConfigurator: true,
  templateFile: "src/services/_shared/template-servicos.docx",
  formSchema: formSchemaVazio,
  zodSchema: subestacaoZod,
  map: (formData) => {
    const f = formData as SubestacaoForm;
    return mapPropostaPadrao({
      clienteNome: f.clienteNome,
      cidadeUf: f.cidadeUf,
      referenciaSeq: f.referenciaSeq,
      dataEmissao: f.dataEmissao,
      validadeDias: f.validadeDias,
      formaPagamento: f.formaPagamento,
      referencePrefix: "PROJSE",
      titulo: f.titulo,
      objeto: f.objeto,
      localAtividade: f.localAtividade,
      itens: f.itens.map((it) => ({
        descricao: it.descricao,
        valor: parseNumber(it.valor) || null,
        condicao: it.condicao,
      })),
      observacoes: f.observacoes ?? [],
      prazoExecucao: f.prazoExecucao,
    });
  },
};

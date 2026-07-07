import { z } from "zod";
import type { ServiceModule } from "../types";
import { identZod, naoVazio } from "../_shared";
import { mapPropostaPadrao } from "../_cpq/proposta";
import { parseNumber } from "@/lib/format";

/**
 * Rede de Distribuição MT/BT — configurador próprio: precifica projeto e/ou
 * execução pelo modelo real da GTA (projeto = custo × Fator K / (1−NF);
 * execução = custo × Fator K). O RedeMtConfigurator monta os itens já
 * precificados e envia este formData; o .docx usa o molde padrão.
 */

const itemSchema = z.object({
  descricao: z.string().min(1),
  valor: z.string().default("0"),
  condicao: z.string().optional().default(""),
});

const redeMtZod = z.object({
  ...identZod,
  localAtividade: z.string().optional().default(""),
  titulo: naoVazio("Informe o título"),
  objeto: naoVazio("Informe o objeto"),
  prazoExecucao: naoVazio("Informe o prazo"),
  itens: z.array(itemSchema).min(1, "Ao menos um item de escopo"),
  observacoes: z.array(z.string()).optional().default([]),
});

type RedeMtForm = z.infer<typeof redeMtZod>;

export const redeMtService: ServiceModule = {
  key: "rede-mt",
  label: "Rede de Distribuição MT/BT",
  description: "Precifica projeto e/ou execução de rede MT/BT (por custo × Fator K).",
  referencePrefix: "REDEMT",
  validityDays: 20,
  usesConfigurator: true,
  templateFile: "src/services/_shared/template-servicos.docx",
  formSchema: { sections: [] },
  zodSchema: redeMtZod,
  map: (formData) => {
    const f = formData as RedeMtForm;
    return mapPropostaPadrao({
      clienteNome: f.clienteNome,
      cidadeUf: f.cidadeUf,
      referenciaSeq: f.referenciaSeq,
      dataEmissao: f.dataEmissao,
      validadeDias: f.validadeDias,
      formaPagamento: f.formaPagamento,
      referencePrefix: "REDEMT",
      titulo: f.titulo,
      objeto: f.objeto,
      localAtividade: f.localAtividade,
      itens: f.itens.map((it) => ({ descricao: it.descricao, valor: parseNumber(it.valor) || null, condicao: it.condicao })),
      observacoes: f.observacoes ?? [],
      prazoExecucao: f.prazoExecucao,
    });
  },
};

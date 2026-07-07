import { z } from "zod";
import type { ServiceModule } from "../types";
import { identFields, identZod, naoVazio } from "../_shared";
import { mapPropostaPadrao, TEMPLATE_SERVICOS } from "../_cpq/proposta";
import { parseNumber } from "@/lib/format";

/**
 * Orçamento de Conexão junto à concessionária.
 * REGRA FIXA (gestão): 2 salários mínimos — engloba trâmites, consultoria junto
 * à concessionária (Equatorial etc.) e acompanhamento interno até a conexão.
 * O valor do salário mínimo vigente é informado no formulário (muda por lei).
 */

/** Salário mínimo nacional vigente (R$) — atualizar quando houver reajuste. */
const SALARIO_MINIMO_PADRAO = 1630;
const QTD_SALARIOS = 2;

const OBJETO_PADRAO =
  "Tratativas junto à concessionária para análise de viabilidade técnica, liberação de carga e " +
  "acompanhamento da conexão da unidade consumidora, incluindo consultoria e trâmites documentais.";

const OBS_PADRAO = [
  "Serviços executados conforme normas técnicas vigentes e padrões da concessionária.",
  "Aprovações e prazos de conexão sujeitos à análise da concessionária.",
  "Prazos condicionados à entrega de documentos e liberações pelo cliente.",
];

const schema = z.object({
  ...identZod,
  localAtividade: z.string().optional().default(""),
  objeto: naoVazio("Informe o objeto"),
  salarioMinimo: naoVazio("Informe o salário mínimo vigente"),
  observacoes: z.string().optional().default(OBS_PADRAO.join("\n")),
  prazoExecucao: naoVazio("Informe o prazo"),
});
type Form = z.infer<typeof schema>;

export const conexaoConcessionariaService: ServiceModule = {
  key: "conexao",
  label: "Orçamento de Conexão",
  description: "Viabilidade, liberação de carga e acompanhamento junto à concessionária — tabelado em 2 salários mínimos.",
  icon: "🔌",
  referencePrefix: "CONEXAO",
  validityDays: 20,
  emDesenvolvimento: true,
  templateFile: TEMPLATE_SERVICOS,
  formSchema: {
    sections: [
      { title: "Identificação", fields: identFields({ validadeDias: 20 }) },
      {
        title: "Serviço",
        description: `Valor tabelado: ${QTD_SALARIOS} salários mínimos (trâmites + consultoria + acompanhamento).`,
        fields: [
          { name: "localAtividade", label: "Local da unidade consumidora", type: "text", width: "half", placeholder: "Ex.: Goianápolis/GO" },
          { name: "salarioMinimo", label: "Salário mínimo vigente (R$)", type: "currency", required: true, width: "half", defaultValue: String(SALARIO_MINIMO_PADRAO), help: `O serviço é tabelado em ${QTD_SALARIOS} salários mínimos — atualize aqui quando o SM mudar.` },
          { name: "objeto", label: "Objeto", type: "textarea", required: true, width: "full", defaultValue: OBJETO_PADRAO },
          { name: "observacoes", label: "Condições gerais (uma por linha)", type: "textarea", width: "full", defaultValue: OBS_PADRAO.join("\n") },
          { name: "prazoExecucao", label: "Prazo", type: "text", required: true, width: "half", defaultValue: "Conforme prazos de análise da concessionária" },
        ],
      },
    ],
  },
  zodSchema: schema,
  map: (formData) => {
    const f = formData as Form;
    const sm = parseNumber(f.salarioMinimo);
    return mapPropostaPadrao({
      ...f,
      referencePrefix: "CONEXAO",
      titulo: "PROPOSTA TÉCNICA E COMERCIAL — CONEXÃO JUNTO À CONCESSIONÁRIA",
      objeto: f.objeto,
      localAtividade: f.localAtividade,
      itens: [
        {
          descricao:
            "Orçamento de conexão: análise de viabilidade, liberação de carga, consultoria junto à concessionária e acompanhamento interno até a efetiva conexão",
          valor: QTD_SALARIOS * sm,
          condicao: "50% na contratação e 50% após a efetiva conexão",
        },
      ],
      observacoes: (f.observacoes ?? "").split("\n"),
      prazoExecucao: f.prazoExecucao,
    });
  },
};

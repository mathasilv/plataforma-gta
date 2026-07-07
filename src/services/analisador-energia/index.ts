import { z } from "zod";
import type { ServiceModule } from "../types";
import { identFields, identZod, naoVazio } from "../_shared";
import { mapPropostaPadrao, TEMPLATE_SERVICOS } from "../_cpq/proposta";

/**
 * Locação de Analisador de Energia.
 * REGRA FIXA (gestão): R$ 1.500,00 por semana — inclui instalação, medição e
 * relatório. A única variável é o número de semanas.
 */

/** Valor fixo por semana de locação (regra da gestão — inegociável). */
const VALOR_SEMANA = 1500;

const OBJETO_PADRAO =
  "Locação de analisador de energia com instalação, parametrização, período de medição e " +
  "emissão de relatório técnico com os registros de grandezas elétricas.";

const OBS_PADRAO = [
  "Instalação e retirada do equipamento inclusas.",
  "Relatório técnico entregue ao final do período de medição.",
  "O equipamento permanece sob responsabilidade do cliente durante a medição.",
];

const schema = z.object({
  ...identZod,
  localAtividade: z.string().optional().default(""),
  objeto: naoVazio("Informe o objeto"),
  semanas: z.coerce.number().int().min(1, "Mínimo 1 semana").max(52),
  observacoes: z.string().optional().default(OBS_PADRAO.join("\n")),
});
type Form = z.infer<typeof schema>;

export const analisadorEnergiaService: ServiceModule = {
  key: "analisador",
  label: "Analisador de Energia",
  description: "Locação com instalação, medição e relatório — R$ 1.500 por semana.",
  icon: "📈",
  referencePrefix: "ANALISADOR",
  validityDays: 20,
  emDesenvolvimento: true,
  templateFile: TEMPLATE_SERVICOS,
  formSchema: {
    sections: [
      { title: "Identificação", fields: identFields({ validadeDias: 20 }) },
      {
        title: "Medição",
        description: `Valor tabelado: R$ ${VALOR_SEMANA.toLocaleString("pt-BR")},00 por semana de locação.`,
        fields: [
          { name: "localAtividade", label: "Local da medição", type: "text", width: "half", placeholder: "Ex.: Subestação da fábrica — Aparecida de Goiânia/GO" },
          { name: "semanas", label: "Semanas de medição", type: "number", required: true, width: "third", defaultValue: 1 },
          { name: "objeto", label: "Objeto", type: "textarea", required: true, width: "full", defaultValue: OBJETO_PADRAO },
          { name: "observacoes", label: "Condições gerais (uma por linha)", type: "textarea", width: "full", defaultValue: OBS_PADRAO.join("\n") },
        ],
      },
    ],
  },
  zodSchema: schema,
  map: (formData) => {
    const f = formData as Form;
    const semanas = Number(f.semanas);
    return mapPropostaPadrao({
      ...f,
      referencePrefix: "ANALISADOR",
      titulo: "PROPOSTA TÉCNICA E COMERCIAL — ANÁLISE DE ENERGIA",
      objeto: f.objeto,
      localAtividade: f.localAtividade,
      itens: [
        {
          descricao: `Locação de analisador de energia por ${semanas} semana${semanas > 1 ? "s" : ""}, incluindo instalação, medição e relatório técnico`,
          valor: VALOR_SEMANA * semanas,
          condicao: "100% na retirada do relatório",
        },
      ],
      observacoes: (f.observacoes ?? "").split("\n"),
      prazoExecucao: `${semanas} semana${semanas > 1 ? "s" : ""} de medição + emissão do relatório`,
    });
  },
};

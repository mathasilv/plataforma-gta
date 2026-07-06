import { z } from "zod";
import type { ServiceModule } from "../types";
import {
  cronogramaField,
  cronogramaZod,
  identData,
  identFields,
  identZod,
  money,
  naoVazio,
} from "../_shared";
import { formatBRL, numberToWords } from "@/lib/format";

/** Serviço: Limpeza de Painéis Solares Fotovoltaicos. */

const zodSchema = z.object({
  ...identZod,
  validadeDias: z.coerce.number().int().min(1).default(30),
  subtitulo: naoVazio("Informe o subtítulo").default(
    "LIMPEZA DE PAINÉIS SOLARES FOTOVOLTAICOS  ·  PLACAS  ·  RESIDÊNCIA",
  ),
  localServico: naoVazio("Informe o local do serviço"),
  objeto: naoVazio("Informe o objeto"),
  prazoExecucao: z.string().default("10 dias corridos a partir da aprovação da proposta"),
  textoObjeto: naoVazio("Informe o texto do objeto"),
  textoAbrangencia: naoVazio("Informe a abrangência"),
  textoMaoObra: naoVazio("Informe o item de mão de obra"),
  descricaoServico: naoVazio("Informe a descrição do serviço"),
  textoPrazo: naoVazio("Informe o texto do prazo"),
  valorTotal: naoVazio("Informe o valor total"),
  pagamentos: z
    .array(z.object({ parcela: z.string(), evento: z.string(), percentual: z.coerce.number() }))
    .min(1)
    .default([
      { parcela: "1ª", evento: "Entrada — no ato da aprovação da proposta, para mobilização da equipe", percentual: 30 },
      { parcela: "2ª", evento: "Após a conclusão do serviço de limpeza de todas as placas", percentual: 70 },
    ]),
  cronograma: cronogramaZod.default([
    { etapa: "Aprovação da proposta e pagamento da 1ª parcela (30%)", prazo: "Dia D", responsavel: "Cliente" },
    { etapa: "Mobilização da equipe e agendamento com o responsável", prazo: "D + 1 a D + 3", responsavel: "GTA Energia" },
    { etapa: "Inspeção prévia e limpeza dos painéis", prazo: "D + 3 a D + 9", responsavel: "GTA Energia" },
    { etapa: "Entrega do relatório fotográfico e 2ª parcela (70%)", prazo: "D + 10", responsavel: "GTA + Cliente" },
  ]),
  prazoTotal: z.string().default("10 dias corridos"),
});

type Form = z.infer<typeof zodSchema>;

export const limpezaService: ServiceModule = {
  key: "limpeza",
  label: "Limpeza de Painéis Solares",
  description: "Limpeza de módulos fotovoltaicos com inspeção prévia e relatório fotográfico.",
  icon: "🧽",
  referencePrefix: "LIMPEZA",
  validityDays: 30,
  templateFile: "src/services/limpeza/template.docx",
  formSchema: {
    sections: [
      {
        title: "Identificação",
        fields: [
          ...identFields({ validadeDias: 30, formaPagamento: "30% na entrada + 70% após conclusão dos serviços" }),
          { name: "subtitulo", label: "Subtítulo do cabeçalho", type: "text", required: true, width: "full", defaultValue: "LIMPEZA DE PAINÉIS SOLARES FOTOVOLTAICOS  ·  18 PLACAS  ·  RESIDÊNCIA" },
          { name: "localServico", label: "Local do serviço", type: "text", required: true, width: "full", placeholder: "Ex.: Telhado da Residência — Condomínio X — Anápolis/GO" },
          { name: "objeto", label: "Objeto", type: "text", required: true, width: "full", placeholder: "Ex.: Limpeza de 18 Painéis Solares Fotovoltaicos em Residência" },
          { name: "prazoExecucao", label: "Prazo de execução (cabeçalho)", type: "text", required: true, width: "full", defaultValue: "10 dias corridos a partir da aprovação da proposta" },
        ],
      },
      {
        title: "Descrição do serviço",
        fields: [
          { name: "textoObjeto", label: "Texto do objeto (Seção 1)", type: "textarea", required: true, width: "full", defaultValue: "A presente Proposta Técnica e Comercial tem por objeto a prestação do serviço de limpeza de XX (por extenso) painéis solares fotovoltaicos instalados no telhado do cliente." },
          { name: "textoAbrangencia", label: "Abrangência (Seção 2.1)", type: "textarea", required: true, width: "full", defaultValue: "O serviço de limpeza abrangerá as XX placas fotovoltaicas instaladas no local, compreendendo:" },
          { name: "textoMaoObra", label: "Item de mão de obra (Seção 3.1)", type: "text", required: true, width: "full", defaultValue: "Mão de obra técnica especializada para execução da limpeza de todos os XX módulos;" },
          { name: "descricaoServico", label: "Descrição na tabela de valores", type: "text", required: true, width: "full", placeholder: "Ex.: Limpeza de 18 painéis solares fotovoltaicos — Residência — Cliente" },
        ],
      },
      {
        title: "Valores e pagamento",
        fields: [
          { name: "valorTotal", label: "Valor total do serviço (R$)", type: "currency", required: true, width: "half", placeholder: "Ex.: 2.300,00" },
          {
            name: "pagamentos", label: "Parcelas", type: "array", addLabel: "Adicionar parcela",
            defaultRows: [
              { defaults: { parcela: "1ª", evento: "Entrada — no ato da aprovação da proposta, para mobilização da equipe", percentual: 30 } },
              { defaults: { parcela: "2ª", evento: "Após a conclusão do serviço de limpeza de todas as placas", percentual: 70 } },
            ],
            itemFields: [
              { name: "parcela", label: "Parcela", type: "text" },
              { name: "evento", label: "Evento / condição", type: "text" },
              { name: "percentual", label: "%", type: "number" },
            ],
          },
        ],
      },
      {
        title: "Prazo e cronograma",
        fields: [
          { name: "textoPrazo", label: "Texto do prazo (Seção 5)", type: "textarea", required: true, width: "full", defaultValue: "O prazo de execução do serviço de limpeza é de 10 (dez) dias corridos, contados a partir da aprovação desta proposta e do recebimento da entrada contratual (30%)." },
          cronogramaField([
            { etapa: "Aprovação da proposta e pagamento da 1ª parcela (30%)", prazo: "Dia D", responsavel: "Cliente" },
            { etapa: "Mobilização da equipe e agendamento com o responsável", prazo: "D + 1 a D + 3", responsavel: "GTA Energia" },
            { etapa: "Inspeção prévia e limpeza dos painéis", prazo: "D + 3 a D + 9", responsavel: "GTA Energia" },
            { etapa: "Entrega do relatório fotográfico e 2ª parcela (70%)", prazo: "D + 10", responsavel: "GTA + Cliente" },
          ]),
          { name: "prazoTotal", label: "Prazo total (linha final)", type: "text", required: true, width: "half", defaultValue: "10 dias corridos" },
        ],
      },
    ],
  },
  zodSchema,
  map: (formData) => {
    const form = formData as Form;
    const total = money(form.valorTotal);
    return {
      data: {
        ...identData(form, "LIMPEZA"),
        subtitulo: form.subtitulo,
        clienteTitulo: `${form.clienteNome.toUpperCase()} — ${form.cidadeUf.toUpperCase()}`,
        localServico: form.localServico,
        objeto: form.objeto,
        prazoExecucao: form.prazoExecucao,
        textoObjeto: form.textoObjeto,
        textoAbrangencia: form.textoAbrangencia,
        textoMaoObra: form.textoMaoObra,
        descricaoServico: form.descricaoServico,
        textoPrazo: form.textoPrazo,
        valorTotal: total.fmt,
        valorTotalExtenso: total.extenso,
        pagamentos: form.pagamentos.map((p) => ({
          parcela: p.parcela,
          evento: p.evento,
          percentual: `${p.percentual}%`,
          valor: formatBRL((total.n * p.percentual) / 100),
        })),
        cronograma: form.cronograma,
        prazoTotal: form.prazoTotal,
        validadePorExtenso: `${form.validadeDias} (${numberToWords(form.validadeDias)})`,
      },
    };
  },
};

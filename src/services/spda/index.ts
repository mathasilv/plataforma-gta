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
  splitAceite,
} from "../_shared";
import { capitalize, formatBRL, moneyToWords, numberToWords } from "@/lib/format";

/** Serviço: Análise de Gerenciamento de Risco + Projeto de SPDA (NBR 5419). */

const zodSchema = z.object({
  ...identZod,
  validadeDias: z.coerce.number().int().min(1).default(20),
  subtitulo: naoVazio("Informe o subtítulo").default("ANÁLISE DE GERENCIAMENTO DE RISCO  ·  PROJETO DE SPDA — NBR 5419"),
  endereco: naoVazio("Informe o endereço"),
  objeto: naoVazio("Informe o objeto").default("Análise de Gerenciamento de Risco + Projeto de SPDA — conforme ABNT NBR 5419"),
  textoObjeto: naoVazio("Informe o texto do objeto"),
  textoDeslocamento: naoVazio("Informe o item de deslocamento"),
  textoPrazo: naoVazio("Informe o texto do prazo"),
  valorRisco: naoVazio("Informe o valor da análise de risco"),
  valorProjeto: naoVazio("Informe o valor do projeto de SPDA"),
  pagamentos: z
    .array(z.object({ percentual: z.coerce.number(), texto: z.string() }))
    .min(1)
    .default([
      { percentual: 50, texto: "no ato da aprovação do orçamento e realização da visita técnica" },
      { percentual: 50, texto: "na entrega de todos os documentos técnicos e ARTs" },
    ]),
  cronograma: cronogramaZod.default([
    { etapa: "Aprovação e recebimento da entrada contratual", prazo: "Dia D", responsavel: "Cliente + GTA" },
    { etapa: "Visita técnica ao local + medição de resistividade do solo", prazo: "D + 7 dias", responsavel: "GTA Energia" },
    { etapa: "Análise de Gerenciamento de Risco + relatório e laudo", prazo: "D + 7 a D + 20", responsavel: "GTA Energia" },
    { etapa: "Elaboração do Projeto de SPDA (pranchas, listas, memoriais)", prazo: "D + 15 a D + 38", responsavel: "GTA Energia" },
    { etapa: "Emissão das ARTs junto ao CREA/GO", prazo: "D + 38 a D + 42", responsavel: "GTA Energia" },
    { etapa: "Entrega dos documentos ao cliente + última parcela", prazo: "Até D + 45", responsavel: "GTA + Cliente" },
  ]),
  prazoTotal: z.string().default("45 dias corridos"),
});

type Form = z.infer<typeof zodSchema>;

export const spdaService: ServiceModule = {
  key: "spda",
  label: "SPDA + Gerenciamento de Risco",
  description: "Análise de risco e projeto de SPDA conforme ABNT NBR 5419.",
  icon: "🌩️",
  referencePrefix: "SPDA",
  validityDays: 20,
  templateFile: "src/services/spda/template.docx",
  formSchema: {
    sections: [
      {
        title: "Identificação",
        fields: [
          ...identFields({ validadeDias: 20 }),
          { name: "endereco", label: "Endereço da edificação", type: "text", required: true, width: "full", placeholder: "Ex.: Rua X, Q7, L1 — Bairro — Cidade/GO" },
          { name: "subtitulo", label: "Subtítulo do cabeçalho", type: "text", required: true, width: "full", defaultValue: "ANÁLISE DE GERENCIAMENTO DE RISCO  ·  PROJETO DE SPDA — NBR 5419" },
          { name: "objeto", label: "Objeto", type: "text", required: true, width: "full", defaultValue: "Análise de Gerenciamento de Risco + Projeto de SPDA — conforme ABNT NBR 5419" },
        ],
      },
      {
        title: "Textos do orçamento",
        fields: [
          { name: "textoObjeto", label: "Texto do objeto (Seção 1)", type: "textarea", required: true, width: "full", defaultValue: "O presente Orçamento Técnico e Comercial tem por objeto a prestação de serviços de engenharia elétrica para elaboração do Projeto de Análise de Gerenciamento de Risco e do Projeto de SPDA (Sistema de Proteção contra Descargas Atmosféricas) para o cliente." },
          { name: "textoDeslocamento", label: "Item de deslocamento da visita (Seção 2.1)", type: "text", required: true, width: "full", defaultValue: "Deslocamento da equipe técnica ao endereço da edificação;" },
          { name: "textoPrazo", label: "Texto do prazo (Seção 5)", type: "textarea", required: true, width: "full", defaultValue: "O prazo estimado de entrega dos documentos técnicos é de 45 dias corridos, contados a partir da aprovação deste orçamento, recebimento da entrada contratual e realização da visita técnica ao local." },
        ],
      },
      {
        title: "Valores e pagamento",
        fields: [
          { name: "valorRisco", label: "Valor — Análise de Risco (R$)", type: "currency", required: true, width: "half", placeholder: "Ex.: 9.900,00" },
          { name: "valorProjeto", label: "Valor — Projeto de SPDA (R$)", type: "currency", required: true, width: "half", placeholder: "Ex.: 11.970,00" },
          {
            name: "pagamentos", label: "Sugestão de pagamento (bullets)", type: "array", addLabel: "Adicionar parcela",
            defaultRows: [
              { defaults: { percentual: 50, texto: "no ato da aprovação do orçamento e realização da visita técnica" } },
              { defaults: { percentual: 50, texto: "na entrega de todos os documentos técnicos e ARTs" } },
            ],
            itemFields: [
              { name: "percentual", label: "%", type: "number", width: "third" },
              { name: "texto", label: "Condição", type: "text" },
            ],
          },
        ],
      },
      {
        title: "Prazo e cronograma",
        fields: [
          cronogramaField([
            { etapa: "Aprovação e recebimento da entrada contratual", prazo: "Dia D", responsavel: "Cliente + GTA" },
            { etapa: "Visita técnica ao local + medição de resistividade do solo", prazo: "D + 7 dias", responsavel: "GTA Energia" },
            { etapa: "Análise de Gerenciamento de Risco + relatório e laudo", prazo: "D + 7 a D + 20", responsavel: "GTA Energia" },
            { etapa: "Elaboração do Projeto de SPDA (pranchas, listas, memoriais)", prazo: "D + 15 a D + 38", responsavel: "GTA Energia" },
            { etapa: "Emissão das ARTs junto ao CREA/GO", prazo: "D + 38 a D + 42", responsavel: "GTA Energia" },
            { etapa: "Entrega dos documentos ao cliente + última parcela", prazo: "Até D + 45", responsavel: "GTA + Cliente" },
          ]),
          { name: "prazoTotal", label: "Prazo total (linha final)", type: "text", required: true, width: "half", defaultValue: "45 dias corridos" },
        ],
      },
    ],
  },
  zodSchema,
  map: (formData) => {
    const form = formData as Form;
    const risco = money(form.valorRisco);
    const projeto = money(form.valorProjeto);
    const totalN = risco.n + projeto.n;
    const aceite = splitAceite(form.clienteNome.toUpperCase());
    return {
      data: {
        ...identData(form, "SPDA"),
        subtitulo: form.subtitulo,
        clienteTitulo: `${form.clienteNome.toUpperCase()} — ${form.cidadeUf.toUpperCase()}`,
        endereco: form.endereco,
        objeto: form.objeto,
        textoObjeto: form.textoObjeto,
        textoDeslocamento: form.textoDeslocamento,
        textoPrazo: form.textoPrazo,
        valorRisco: risco.fmt,
        valorProjeto: projeto.fmt,
        valorTotal: formatBRL(totalN),
        valorTotalExtenso: `${capitalize(moneyToWords(totalN))} (sendo ${risco.fmt} referente ao gerenciamento de risco e ${projeto.fmt} referente ao projeto de SPDA).`,
        pagamentos: form.pagamentos.map((p, i) => ({
          linha: `${p.percentual}% ${p.texto} (${formatBRL((totalN * p.percentual) / 100)})${i === form.pagamentos.length - 1 ? "." : ";"}`,
        })),
        cronograma: form.cronograma,
        prazoTotal: form.prazoTotal,
        aceiteLinha1: aceite.linha1,
        aceiteLinha2: aceite.linha2,
        validadePorExtenso: `${form.validadeDias} (${numberToWords(form.validadeDias)})`,
      },
    };
  },
};

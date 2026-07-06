import { z } from "zod";
import type { ServiceModule } from "../types";
import {
  cronogramaField,
  cronogramaZod,
  identData,
  identFields,
  identZod,
  naoVazio,
} from "../_shared";
import { capitalize, formatBRL, moneyToWords, parseNumber, numberToWords } from "@/lib/format";

/** Serviço: Execução de Rede MT/BT em Loteamento Residencial. */

const zodSchema = z.object({
  ...identZod,
  validadeDias: z.coerce.number().int().min(1).default(30),
  tituloCabecalho: z.string().optional().default(""),
  subtitulo: naoVazio("Informe o subtítulo").default("EXECUÇÃO DE REDE DE DISTRIBUIÇÃO MT/BT  ·  LOTEAMENTO RESIDENCIAL"),
  localServico: naoVazio("Informe o local do serviço"),
  objeto: naoVazio("Informe o objeto").default("Execução de Rede de Distribuição de Energia Elétrica MT/BT em Loteamento Residencial"),
  prazoExecucao: z.string().default("90 dias corridos após aprovação da proposta e entrega dos materiais"),
  concessionaria: z.string().default("Equatorial Goiás"),
  textoObjeto: naoVazio("Informe o texto do objeto"),
  textoPrazo: naoVazio("Informe o texto do prazo"),
  nomeLocal: naoVazio("Informe o nome do loteamento"),
  investimento: z
    .array(z.object({ num: z.string(), titulo: z.string(), descricao: z.string(), faturamento: z.string(), valor: z.string() }))
    .min(1),
  pagamentos: z.array(z.object({ parcela: z.string(), evento: z.string(), percentual: z.coerce.number() })).min(1),
  cronograma: cronogramaZod,
  prazoDias: z.coerce.number().int().min(1).default(90),
  prazoTotal: z.string().default("90 dias corridos"),
});

type Form = z.infer<typeof zodSchema>;

export const loteamentoMtbtService: ServiceModule = {
  key: "loteamento-mtbt",
  label: "Rede MT/BT de Loteamento",
  description: "Execução completa de rede de distribuição MT/BT para loteamentos.",
  icon: "🏘️",
  referencePrefix: "MTBT",
  validityDays: 30,
  templateFile: "src/services/loteamento-mtbt/template.docx",
  formSchema: {
    sections: [
      {
        title: "Identificação",
        fields: [
          ...identFields({ validadeDias: 30, formaPagamento: "60% entrada + 30% medições quinzenais + 10% conclusão" }),
          { name: "tituloCabecalho", label: "Linha do cliente no cabeçalho (opcional)", type: "text", width: "full" },
          { name: "localServico", label: "Local do serviço", type: "text", required: true, width: "half", placeholder: "Ex.: Senador Canedo — GO" },
          { name: "nomeLocal", label: "Nome do loteamento", type: "text", required: true, width: "half", placeholder: "Ex.: Loteamento Residencial Jatobá" },
          { name: "subtitulo", label: "Subtítulo do cabeçalho", type: "text", required: true, width: "full", defaultValue: "EXECUÇÃO DE REDE DE DISTRIBUIÇÃO MT/BT  ·  LOTEAMENTO RESIDENCIAL" },
          { name: "objeto", label: "Objeto", type: "text", required: true, width: "full", defaultValue: "Execução de Rede de Distribuição de Energia Elétrica MT/BT em Loteamento Residencial" },
          { name: "prazoExecucao", label: "Prazo de execução (cabeçalho)", type: "text", required: true, width: "half", defaultValue: "90 dias corridos após aprovação da proposta e entrega dos materiais" },
          { name: "concessionaria", label: "Concessionária", type: "text", required: true, width: "half", defaultValue: "Equatorial Goiás" },
        ],
      },
      {
        title: "Textos",
        fields: [
          { name: "textoObjeto", label: "Texto do objeto (Seção 1)", type: "textarea", required: true, width: "full", defaultValue: "A presente Proposta Técnica e Comercial tem por objeto a execução completa da rede de distribuição de energia elétrica em média tensão (MT) e baixa tensão (BT) para o loteamento, incluindo todos os serviços de engenharia, mão de obra especializada, mobilização de equipamentos e ferramental necessários à implantação integral do sistema de distribuição." },
        ],
      },
      {
        title: "Investimento e pagamento",
        fields: [
          {
            name: "investimento", label: "Composição do investimento (Seção 5.1)", type: "array", addLabel: "Adicionar item",
            defaultRows: [
              { defaults: { num: "01", titulo: "Serviços de engenharia e execução — Rede MT/BT completa", descricao: "Projeto, aprovação na concessionária, ARTs, mão de obra especializada, montagem, lançamento, comissionamento e entrega do dossiê técnico.", faturamento: "GTA Energia Ltda", valor: "" } },
              { defaults: { num: "02", titulo: "Materiais e equipamentos da rede MT/BT — fornecimento", descricao: "Postes, cabos MT/BT, transformadores, chaves, para-raios, cruzetas, ferragens, isoladores, padrões de entrada e demais componentes. Aquisição direta pelo cliente.", faturamento: "Direto — Cliente (Administração GTA)", valor: "" } },
            ],
            itemFields: [
              { name: "num", label: "#", type: "text" },
              { name: "titulo", label: "Título", type: "text" },
              { name: "descricao", label: "Descrição", type: "text" },
              { name: "faturamento", label: "Faturamento", type: "text" },
              { name: "valor", label: "Valor (R$)", type: "text" },
            ],
          },
          {
            name: "pagamentos", label: "Condições de pagamento (% sobre o total)", type: "array", addLabel: "Adicionar parcela",
            defaultRows: [
              { defaults: { parcela: "1ª", evento: "Entrada — no ato da aprovação da proposta e assinatura do contrato, para mobilização da equipe e início das atividades", percentual: 60 } },
              { defaults: { parcela: "2ª a N", evento: "Medições quinzenais conforme avanço físico dos serviços — a serem pagas até a conclusão de cada etapa medida", percentual: 30 } },
              { defaults: { parcela: "Final", evento: "Saldo remanescente — após conclusão integral dos serviços, comissionamento e entrega do dossiê técnico", percentual: 10 } },
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
          { name: "textoPrazo", label: "Texto do prazo (Seção 6)", type: "textarea", required: true, width: "full", defaultValue: "O prazo de execução total dos serviços é de 90 (noventa) dias corridos, contados a partir da data de aprovação desta proposta, assinatura do contrato, recebimento da entrada contratual (60%) e disponibilização dos materiais no canteiro de obras pelo cliente." },
          { name: "prazoDias", label: "Prazo (dias) — usado nos avisos", type: "number", required: true, width: "third", defaultValue: 90 },
          { name: "prazoTotal", label: "Prazo total (linha final)", type: "text", required: true, width: "third", defaultValue: "90 dias corridos" },
          cronogramaField([
            { etapa: "Aprovação, contrato e 1ª parcela (60%) + disponibilização dos materiais", prazo: "Dia D", responsavel: "Cliente + GTA" },
            { etapa: "Elaboração/revisão do projeto e submissão à concessionária", prazo: "D + 1 a D + 15", responsavel: "GTA Energia" },
            { etapa: "Aprovação do projeto pela concessionária", prazo: "D + 15 a D + 30*", responsavel: "Concessionária" },
            { etapa: "Mobilização da equipe e início das obras", prazo: "D + 30", responsavel: "GTA Energia" },
            { etapa: "Execução da rede MT — postes, estruturas e cabeamento", prazo: "D + 30 a D + 55", responsavel: "GTA Energia" },
            { etapa: "Execução da rede BT — cabos, caixas e ligações dos lotes", prazo: "D + 50 a D + 75", responsavel: "GTA Energia" },
            { etapa: "Comissionamento, testes e acompanhamento da vistoria", prazo: "D + 75 a D + 85", responsavel: "GTA + Concessionária" },
            { etapa: "Entrega do dossiê técnico e saldo final (10%)", prazo: "D + 90", responsavel: "GTA + Cliente" },
          ]),
        ],
      },
    ],
  },
  zodSchema,
  map: (formData) => {
    const form = formData as Form;
    const gtaN = parseNumber(form.investimento[0]?.valor ?? 0);
    const totalN = form.investimento.reduce((s, i) => s + parseNumber(i.valor), 0);
    const materiaisN = totalN - gtaN;
    return {
      data: {
        ...identData(form, "MTBT"),
        subtitulo: form.subtitulo,
        clienteTitulo:
          form.tituloCabecalho?.trim() || `${form.clienteNome.toUpperCase()} — ${form.cidadeUf.toUpperCase()}`,
        localServico: form.localServico,
        objeto: form.objeto,
        prazoExecucao: form.prazoExecucao,
        concessionaria: form.concessionaria,
        textoObjeto: form.textoObjeto,
        textoPrazo: form.textoPrazo,
        nomeLocal: form.nomeLocal,
        investimento: form.investimento.map((i) => ({ ...i, valor: formatBRL(parseNumber(i.valor)) })),
        valorTotal: formatBRL(totalN),
        extensoLinha: `${capitalize(moneyToWords(gtaN))} — faturamento GTA Energia (serviços de execução). ${formatBRL(materiaisN)} — faturamento direto para o cliente (materiais e equipamentos). Investimento total: ${moneyToWords(totalN)}.`,
        pagamentos: form.pagamentos.map((p) => ({
          parcela: p.parcela,
          evento: p.evento,
          percentual: `${p.percentual}%`,
          valor: formatBRL((totalN * p.percentual) / 100),
        })),
        cronograma: form.cronograma,
        prazoDias: String(form.prazoDias),
        prazoTotal: form.prazoTotal,
        validadePorExtenso: `${form.validadeDias} (${numberToWords(form.validadeDias)})`,
      },
    };
  },
};

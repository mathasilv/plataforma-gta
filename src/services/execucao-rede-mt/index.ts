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
import { formatBRL, parseNumber, numberToWords } from "@/lib/format";

/** Serviço: Execução de Rede de Distribuição MT (obra). */

const investimentoZod = z
  .array(
    z.object({
      num: z.string(),
      titulo: z.string(),
      descricao: z.string(),
      faturamento: z.string(),
      valor: z.string(),
    }),
  )
  .min(1);

const zodSchema = z.object({
  ...identZod,
  validadeDias: z.coerce.number().int().min(1).default(30),
  tituloCabecalho: z.string().optional().default(""),
  subtitulo: naoVazio("Informe o subtítulo"),
  localServico: naoVazio("Informe o local do serviço"),
  objeto: naoVazio("Informe o objeto"),
  prazoExecucao: z.string().default("120 dias corridos após aprovação e entrega dos materiais (condicionado ao projeto aprovado)"),
  concessionaria: z.string().default("Equatorial Goiás"),
  textoObjeto: naoVazio("Informe o texto do objeto"),
  textoPrazo: naoVazio("Informe o texto do prazo"),
  nomeLocal: naoVazio("Informe o nome do local"),
  cidadeLocal: naoVazio("Informe a cidade do local"),
  tensaoMT: naoVazio("Informe a tensão MT (ex.: 13,8 kV)"),
  extensao: naoVazio("Informe a extensão (ex.: 1 km)"),
  investimento: investimentoZod,
  pagamentos: z.array(z.object({ parcela: z.string(), evento: z.string(), percentual: z.coerce.number() })).min(1),
  cronograma: cronogramaZod,
  prazoDias: z.coerce.number().int().min(1).default(120),
  prazoTotal: z.string().default("120 dias corridos"),
  aceiteNome: naoVazio("Informe o nome no aceite"),
  aceiteResponsavel: naoVazio("Informe o responsável no aceite"),
});

type Form = z.infer<typeof zodSchema>;

export const execucaoRedeMtService: ServiceModule = {
  key: "execucao-rede-mt",
  label: "Execução de Rede MT",
  description: "Execução de rede de distribuição em média tensão (obra completa).",
  icon: "🏗️",
  referencePrefix: "MT",
  validityDays: 30,
  templateFile: "src/services/execucao-rede-mt/template.docx",
  formSchema: {
    sections: [
      {
        title: "Identificação",
        fields: [
          ...identFields({ validadeDias: 30, formaPagamento: "60% entrada + 30% medições quinzenais + 10% conclusão" }),
          { name: "tituloCabecalho", label: "Linha do cliente no cabeçalho (opcional)", type: "text", width: "full" },
          { name: "localServico", label: "Local do serviço", type: "text", required: true, width: "full", placeholder: "Ex.: Zona Rural — Bela Vista de Goiás/GO" },
          { name: "subtitulo", label: "Subtítulo do cabeçalho", type: "text", required: true, width: "full", defaultValue: "EXECUÇÃO DE REDE DE DISTRIBUIÇÃO 13,8 kV  ·  ≈ 1 km  ·  ZONA RURAL" },
          { name: "objeto", label: "Objeto", type: "text", required: true, width: "full", defaultValue: "Execução de Rede de Distribuição 13,8 kV — Extensão ≈ 1 km — Zona Rural" },
          { name: "prazoExecucao", label: "Prazo de execução (cabeçalho)", type: "text", required: true, width: "half", defaultValue: "120 dias corridos após aprovação e entrega dos materiais (condicionado ao projeto aprovado)" },
          { name: "concessionaria", label: "Concessionária", type: "text", required: true, width: "half", defaultValue: "Equatorial Goiás" },
        ],
      },
      {
        title: "Dados da obra",
        fields: [
          { name: "nomeLocal", label: "Nome do local/empreendimento", type: "text", required: true, width: "half", placeholder: "Ex.: Fazenda Rio Doce" },
          { name: "cidadeLocal", label: "Cidade do local", type: "text", required: true, width: "half", placeholder: "Ex.: Bela Vista de Goiás/GO" },
          { name: "tensaoMT", label: "Tensão MT", type: "text", required: true, width: "half", defaultValue: "13,8 kV" },
          { name: "extensao", label: "Extensão da rede", type: "text", required: true, width: "half", defaultValue: "1 km" },
          { name: "textoObjeto", label: "Texto do objeto (Seção 1)", type: "textarea", required: true, width: "full", defaultValue: "A presente Proposta Técnica e Comercial tem por objeto a execução da rede de distribuição de energia elétrica em média tensão, incluindo todos os serviços de engenharia, mão de obra especializada, mobilização de equipamentos e ferramental necessários à implantação integral do ramal de média tensão." },
        ],
      },
      {
        title: "Investimento e pagamento",
        fields: [
          {
            name: "investimento", label: "Composição do investimento (Seção 5.1)", type: "array", addLabel: "Adicionar item",
            defaultRows: [
              { defaults: { num: "01", titulo: "Serviços de execução — Rede MT (≈ 1 km rural)", descricao: "Mão de obra especializada: escavação, içamento de postes, montagem de estruturas, lançamento de cabos, proteções, aterramento e comissionamento.", faturamento: "GTA Energia Ltda", valor: "" } },
              { defaults: { num: "02", titulo: "Materiais e equipamentos da rede MT — fornecimento", descricao: "Postes, cabos, cruzetas, ferragens, isoladores, para-raios, chaves fusíveis, aterramento e demais componentes. Aquisição direta pelo cliente conforme projeto aprovado.", faturamento: "GTA Energia - Direto para o Cliente", valor: "" } },
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
              { defaults: { parcela: "1ª", evento: "Entrada — no ato da aprovação da proposta, assinatura do contrato e disponibilização dos materiais no canteiro de obras, para mobilização da equipe e início das atividades", percentual: 60 } },
              { defaults: { parcela: "2ª a N", evento: "Medições quinzenais conforme avanço físico dos serviços, a serem pagas até a conclusão de cada etapa medida, documentadas por boletim de medição assinado por ambas as partes", percentual: 30 } },
              { defaults: { parcela: "Final", evento: "Saldo remanescente — após conclusão integral dos serviços, vistoria da concessionária e entrega do relatório fotográfico ao cliente", percentual: 10 } },
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
        title: "Prazo, cronograma e aceite",
        fields: [
          { name: "textoPrazo", label: "Texto do prazo (Seção 6)", type: "textarea", required: true, width: "full", defaultValue: "O prazo total de execução dos serviços é de 120 (cento e vinte) dias corridos, contados a partir do cumprimento simultâneo das condições contratuais." },
          { name: "prazoDias", label: "Prazo (dias) — usado nos avisos", type: "number", required: true, width: "third", defaultValue: 120 },
          { name: "prazoTotal", label: "Prazo total (linha final)", type: "text", required: true, width: "third", defaultValue: "120 dias corridos" },
          cronogramaField([
            { etapa: "Aprovação, contrato, 1ª parcela (60%) + projeto aprovado + materiais no canteiro", prazo: "Dia D", responsavel: "Cliente + GTA" },
            { etapa: "Mobilização da equipe, equipamentos e verificação dos materiais", prazo: "D + 1 a D + 7", responsavel: "GTA Energia" },
            { etapa: "Locação, marcação, escavação das cavas e içamento dos postes", prazo: "D + 7 a D + 35", responsavel: "GTA Energia" },
            { etapa: "Montagem das estruturas, cruzetas, ferragens e isoladores", prazo: "D + 25 a D + 60", responsavel: "GTA Energia" },
            { etapa: "Lançamento, tensionamento e conexão dos cabos de MT ao longo do trecho", prazo: "D + 50 a D + 85", responsavel: "GTA Energia" },
            { etapa: "Instalação de para-raios, chaves fusíveis e execução do aterramento completo", prazo: "D + 75 a D + 100", responsavel: "GTA Energia" },
            { etapa: "Inspeção técnica, comissionamento e acompanhamento da vistoria", prazo: "D + 100 a D + 115", responsavel: "GTA + Concessionária" },
            { etapa: "Entrega do relatório fotográfico e pagamento do saldo final (10%)", prazo: "D + 120", responsavel: "GTA + Cliente" },
          ]),
          { name: "aceiteNome", label: "Nome no bloco de aceite", type: "text", required: true, width: "half", placeholder: "Ex.: FAZENDA RIO DOCE" },
          { name: "aceiteResponsavel", label: "Responsável no aceite", type: "text", required: true, width: "half", placeholder: "Ex.: Carlos Roberto Viana" },
        ],
      },
    ],
  },
  zodSchema,
  map: (formData) => {
    const form = formData as Form;
    const totalN = form.investimento.reduce((s, i) => s + parseNumber(i.valor), 0);
    return {
      data: {
        ...identData(form, "MT"),
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
        cidadeLocal: form.cidadeLocal,
        tensaoMT: form.tensaoMT,
        extensao: form.extensao,
        investimento: form.investimento.map((i) => ({ ...i, valor: formatBRL(parseNumber(i.valor)) })),
        valorTotal: formatBRL(totalN),
        valorTotalExtenso: money(totalN).extenso,
        pagamentos: form.pagamentos.map((p) => ({
          parcela: p.parcela,
          evento: p.evento,
          percentual: `${p.percentual}%`,
          valor: formatBRL((totalN * p.percentual) / 100),
        })),
        cronograma: form.cronograma,
        prazoDias: String(form.prazoDias),
        prazoTotal: form.prazoTotal,
        aceiteNome: form.aceiteNome,
        aceiteResponsavel: form.aceiteResponsavel,
        validadePorExtenso: `${form.validadeDias} (${numberToWords(form.validadeDias)})`,
      },
    };
  },
};

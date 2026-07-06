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

/** Serviço: Projeto de Rede de Distribuição MT (com travessia de rodovia). */

const zodSchema = z.object({
  ...identZod,
  validadeDias: z.coerce.number().int().min(1).default(30),
  tituloCabecalho: z.string().optional().default(""),
  subtitulo: naoVazio("Informe o subtítulo"),
  localServico: naoVazio("Informe o local do serviço"),
  objeto: naoVazio("Informe o objeto"),
  prazoExecucao: z.string().default("6 meses corridos após aprovação desta proposta"),
  concessionaria: z.string().default("Equatorial Goiás"),
  textoObjeto: naoVazio("Informe o texto do objeto"),
  textoPrazo: naoVazio("Informe o texto do prazo"),
  nomeLocal: naoVazio("Informe o nome do local"),
  cidadeLocal: naoVazio("Informe a cidade do local"),
  rodovia: naoVazio("Informe a rodovia (ex.: GO-147)"),
  tensaoMT: naoVazio("Informe a tensão MT (ex.: 13,8 kV)"),
  servicos: z.array(z.object({ num: z.string(), descricao: z.string(), valor: z.string() })).min(1),
  valorTotal: naoVazio("Informe o valor total"),
  pagamentos: z.array(z.object({ percentual: z.coerce.number(), texto: z.string() })).min(1),
  cronograma: cronogramaZod,
  prazoTotal: z.string().default("6 meses"),
  aceiteLocal: naoVazio("Informe o local no bloco de aceite"),
});

type Form = z.infer<typeof zodSchema>;

export const projetoRedeMtService: ServiceModule = {
  key: "projeto-rede-mt",
  label: "Projeto de Rede MT",
  description: "Projeto de rede de distribuição em média tensão com travessia de rodovia.",
  icon: "🗺️",
  referencePrefix: "RD",
  validityDays: 30,
  templateFile: "src/services/projeto-rede-mt/template.docx",
  formSchema: {
    sections: [
      {
        title: "Identificação",
        fields: [
          ...identFields({ validadeDias: 30 }),
          { name: "tituloCabecalho", label: "Linha do cliente no cabeçalho (opcional)", type: "text", width: "full" },
          { name: "localServico", label: "Local do serviço", type: "text", required: true, width: "full", placeholder: "Ex.: Fazenda Rio Doce — Zona Rural — Bela Vista de Goiás/GO" },
          { name: "subtitulo", label: "Subtítulo do cabeçalho", type: "text", required: true, width: "full", defaultValue: "PROJETO DE REDE DE DISTRIBUIÇÃO 13,8 kV  ·  TRAVESSIA GO-147  ·  ZONA RURAL" },
          { name: "objeto", label: "Objeto", type: "text", required: true, width: "full", defaultValue: "Projeto de RD 13,8 kV com Travessia (≈ 1 km) e Aprovação junto à Concessionária" },
          { name: "prazoExecucao", label: "Prazo de execução (cabeçalho)", type: "text", required: true, width: "half", defaultValue: "6 meses corridos após aprovação desta proposta" },
          { name: "concessionaria", label: "Concessionária", type: "text", required: true, width: "half", defaultValue: "Equatorial Goiás" },
        ],
      },
      {
        title: "Dados do projeto",
        fields: [
          { name: "nomeLocal", label: "Nome do local/empreendimento", type: "text", required: true, width: "half", placeholder: "Ex.: Fazenda Rio Doce" },
          { name: "cidadeLocal", label: "Cidade do local", type: "text", required: true, width: "half", placeholder: "Ex.: Bela Vista de Goiás/GO" },
          { name: "rodovia", label: "Rodovia da travessia", type: "text", required: true, width: "half", defaultValue: "GO-147" },
          { name: "tensaoMT", label: "Tensão MT", type: "text", required: true, width: "half", defaultValue: "13,8 kV" },
          { name: "textoObjeto", label: "Texto do objeto (Seção 1)", type: "textarea", required: true, width: "full", defaultValue: "O presente Orçamento Técnico e Comercial tem por objeto a elaboração do Projeto Elétrico Executivo da Rede de Distribuição em Média Tensão, contemplando a travessia de rodovia, para atendimento elétrico do cliente." },
        ],
      },
      {
        title: "Valores e pagamento",
        fields: [
          {
            name: "servicos", label: "Itens da tabela de serviços (Seção 5.1)", type: "array", addLabel: "Adicionar item",
            defaultRows: [
              { defaults: { num: "01", descricao: "Levantamento técnico de campo — visita ao local e trecho da rodovia, coleta de dados, registro fotográfico e instrução do processo junto ao GOINFRA/DNIT", valor: "—" } },
              { defaults: { num: "02", descricao: "Projeto elétrico executivo da RD — planta georreferenciada, diagrama unifilar, memorial descritivo, lista de materiais e projeto de travessia", valor: "—" } },
              { defaults: { num: "03", descricao: "Acompanhamento do processo de aprovação junto à concessionária — submissão, análise, revisões (até 2) e obtenção da Autorização de Construção", valor: "—" } },
              { defaults: { num: "04", descricao: "Emissão de ART junto ao CREA/GO referente à elaboração do projeto elétrico da RD", valor: "—" } },
            ],
            itemFields: [
              { name: "num", label: "#", type: "text" },
              { name: "descricao", label: "Descrição", type: "text" },
              { name: "valor", label: "Valor", type: "text" },
            ],
          },
          { name: "valorTotal", label: "Valor total (R$)", type: "currency", required: true, width: "half", placeholder: "Ex.: 10.500,00" },
          {
            name: "pagamentos", label: "Sugestão de pagamento", type: "array", addLabel: "Adicionar parcela",
            defaultRows: [
              { defaults: { percentual: 50, texto: "no ato da aprovação deste orçamento e início do levantamento de campo" } },
              { defaults: { percentual: 30, texto: "na entrega do projeto completo com ART" } },
              { defaults: { percentual: 20, texto: "na obtenção da Autorização de Construção da concessionária" } },
            ],
            itemFields: [
              { name: "percentual", label: "%", type: "number", width: "third" },
              { name: "texto", label: "Condição", type: "text" },
            ],
          },
        ],
      },
      {
        title: "Prazo, cronograma e aceite",
        fields: [
          { name: "textoPrazo", label: "Texto do prazo (Seção 6)", type: "textarea", required: true, width: "full", defaultValue: "O prazo total para elaboração, aprovação e entrega do projeto completo é de 6 (seis) meses, contados a partir da aprovação deste orçamento e do recebimento da entrada contratual." },
          cronogramaField([
            { etapa: "Aprovação do orçamento e pagamento da 1ª parcela", prazo: "Dia D", responsavel: "Cliente + GTA" },
            { etapa: "Visita técnica de campo", prazo: "D + 1 a D + 7", responsavel: "GTA Energia" },
            { etapa: "Instrução do processo junto ao GOINFRA/DNIT (travessia)", prazo: "D + 7 a D + 20", responsavel: "GTA Energia" },
            { etapa: "Elaboração do projeto elétrico executivo completo", prazo: "D + 7 a D + 35", responsavel: "GTA Energia" },
            { etapa: "Submissão do projeto à concessionária", prazo: "D + 35 a D + 40", responsavel: "GTA Energia" },
            { etapa: "Análise e aprovação pela concessionária (estimado)", prazo: "D + 40 a D + 80", responsavel: "Concessionária" },
            { etapa: "Revisões, adequações e obtenção da Autorização de Construção", prazo: "D + 80 a D + 88", responsavel: "GTA Energia" },
            { etapa: "Emissão da ART, entrega do dossiê e 2ª parcela", prazo: "Até D + 90", responsavel: "GTA + Cliente" },
          ]),
          { name: "prazoTotal", label: "Prazo total (linha final)", type: "text", required: true, width: "half", defaultValue: "6 meses" },
          { name: "aceiteLocal", label: "Local no bloco de aceite", type: "text", required: true, width: "half" },
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
        ...identData(form, "RD"),
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
        rodovia: form.rodovia,
        tensaoMT: form.tensaoMT,
        servicos: form.servicos,
        valorTotal: total.fmt,
        valorTotalExtenso: total.extenso,
        pagamentos: form.pagamentos.map((p, i) => ({
          linha: `${p.percentual}% ${p.texto} (${formatBRL((total.n * p.percentual) / 100)})${i === form.pagamentos.length - 1 ? "." : ";"}`,
        })),
        cronograma: form.cronograma,
        prazoTotal: form.prazoTotal,
        aceiteLocal: form.aceiteLocal,
        validadePorExtenso: `${form.validadeDias} (${numberToWords(form.validadeDias)})`,
      },
    };
  },
};

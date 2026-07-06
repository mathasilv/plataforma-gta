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

/** Serviço: Projeto de Subestação (elaboração e aprovação junto à concessionária). */

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
  textoDadosIntro: naoVazio("Informe a introdução dos dados técnicos"),
  textoPrazo: naoVazio("Informe o texto do prazo"),
  nomeLocal: naoVazio("Informe o nome do local (ex.: Fazenda Rio Doce)"),
  cidadeLocal: naoVazio("Informe a cidade do local"),
  potencia: naoVazio("Informe a potência (ex.: 750 kVA)"),
  tensaoMT: naoVazio("Informe a tensão MT (ex.: 13,8 kV)"),
  correnteBT: naoVazio("Informe a corrente BT (ex.: 1.139 A)"),
  parametros: z.array(z.object({ parametro: z.string(), valor: z.string() })).min(1),
  servicos: z.array(z.object({ num: z.string(), descricao: z.string(), valor: z.string() })).min(1),
  valorSemDesconto: naoVazio("Informe o valor sem desconto"),
  valorDesconto: z.string().default("0"),
  pagamentos: z.array(z.object({ percentual: z.coerce.number(), texto: z.string() })).min(1),
  cronograma: cronogramaZod,
  prazoTotal: z.string().default("6 meses"),
  aceiteLocal: naoVazio("Informe o local no bloco de aceite"),
});

type Form = z.infer<typeof zodSchema>;

export const projetoSeService: ServiceModule = {
  key: "projeto-se",
  label: "Projeto de Subestação",
  description: "Projeto elétrico executivo de subestação com aprovação na concessionária.",
  icon: "📐",
  referencePrefix: "SE",
  validityDays: 30,
  templateFile: "src/services/projeto-se/template.docx",
  formSchema: {
    sections: [
      {
        title: "Identificação",
        fields: [
          ...identFields({ validadeDias: 30 }),
          { name: "tituloCabecalho", label: "Linha do cliente no cabeçalho (opcional)", type: "text", width: "full", help: "Ex.: CARLOS VIANA — FAZENDA RIO DOCE — BELA VISTA DE GOIÁS/GO. Em branco: NOME — CIDADE/UF." },
          { name: "localServico", label: "Local do serviço", type: "text", required: true, width: "full", placeholder: "Ex.: Fazenda Rio Doce — Zona Rural — Bela Vista de Goiás/GO" },
          { name: "subtitulo", label: "Subtítulo do cabeçalho", type: "text", required: true, width: "full", defaultValue: "PROJETO DE SUBESTAÇÃO EM CUBÍCULO  ·  750 kVA  ·  13,8 kV  ·  ZONA RURAL" },
          { name: "objeto", label: "Objeto", type: "text", required: true, width: "full", defaultValue: "Projeto de Subestação em Cubículo — 750 kVA — 13,8 kV / 380-220 V" },
          { name: "prazoExecucao", label: "Prazo de execução (cabeçalho)", type: "text", required: true, width: "half", defaultValue: "6 meses corridos após aprovação desta proposta" },
          { name: "concessionaria", label: "Concessionária", type: "text", required: true, width: "half", defaultValue: "Equatorial Goiás" },
        ],
      },
      {
        title: "Dados técnicos",
        description: "Estes valores substituem as menções técnicas no corpo do documento.",
        fields: [
          { name: "nomeLocal", label: "Nome do local/empreendimento", type: "text", required: true, width: "half", placeholder: "Ex.: Fazenda Rio Doce" },
          { name: "cidadeLocal", label: "Cidade do local", type: "text", required: true, width: "half", placeholder: "Ex.: Bela Vista de Goiás/GO" },
          { name: "potencia", label: "Potência", type: "text", required: true, width: "third", defaultValue: "750 kVA" },
          { name: "tensaoMT", label: "Tensão MT", type: "text", required: true, width: "third", defaultValue: "13,8 kV" },
          { name: "correnteBT", label: "Corrente BT", type: "text", required: true, width: "third", defaultValue: "1.139 A" },
          {
            name: "parametros", label: "Tabela de parâmetros (Seção 2)", type: "array", addLabel: "Adicionar parâmetro",
            defaultRows: [
              { defaults: { parametro: "Tipo de Subestação", valor: "Cubículo de Média Tensão (Abrigada)" } },
              { defaults: { parametro: "Potência Nominal", valor: "750 kVA" } },
              { defaults: { parametro: "Tensão Primária (MT)", valor: "13.800 V — 13,8 kV (sistema trifásico)" } },
              { defaults: { parametro: "Tensão Secundária (BT)", valor: "380 / 220 V — trifásico + neutro (4 fios)" } },
              { defaults: { parametro: "Grupo de Ligação do Transformador", valor: "Dyn11" } },
              { defaults: { parametro: "Categoria da UC", valor: "Grupo A4 — MT 13,8 kV" } },
              { defaults: { parametro: "Classe de Tensão dos Equipamentos MT", valor: "15 kV" } },
              { defaults: { parametro: "Corrente Nominal no Secundário (BT)", valor: "In ≈ 1.139 A" } },
              { defaults: { parametro: "Local de Instalação", valor: "" } },
            ],
            itemFields: [
              { name: "parametro", label: "Parâmetro", type: "text" },
              { name: "valor", label: "Especificação", type: "text" },
            ],
          },
        ],
      },
      {
        title: "Textos",
        fields: [
          { name: "textoObjeto", label: "Texto do objeto (Seção 1)", type: "textarea", required: true, width: "full", defaultValue: "A presente Proposta Técnica e Comercial tem por objeto a elaboração do Projeto Elétrico Executivo da Subestação de Energia, destinada ao atendimento das cargas elétricas do cliente." },
          { name: "textoDadosIntro", label: "Introdução dos dados técnicos (Seção 2)", type: "textarea", required: true, width: "full", defaultValue: "Com base na demanda elétrica do cliente e nas características do sistema de fornecimento da concessionária na região, os principais parâmetros da subestação projetada são:" },
        ],
      },
      {
        title: "Valores e pagamento",
        fields: [
          {
            name: "servicos", label: "Itens da tabela de serviços (Seção 6.1)", type: "array", addLabel: "Adicionar item",
            defaultRows: [
              { defaults: { num: "01", descricao: "Levantamento técnico de campo — visita ao local, coleta de dados de carga e demanda, análise de viabilidade do ponto de conexão e definição do local do cubículo", valor: "—" } },
              { defaults: { num: "02", descricao: "Projeto elétrico executivo da subestação — diagrama unifilar, planta baixa, detalhamentos, memorial descritivo, especificação de equipamentos e lista de materiais", valor: "—" } },
              { defaults: { num: "03", descricao: "Acompanhamento do processo de aprovação junto à concessionária — submissão, análise, revisões (até 2) e obtenção da Autorização de Construção", valor: "—" } },
              { defaults: { num: "04", descricao: "Emissão de ART junto ao CREA/GO referente à elaboração do projeto da subestação", valor: "—" } },
            ],
            itemFields: [
              { name: "num", label: "#", type: "text" },
              { name: "descricao", label: "Descrição", type: "text" },
              { name: "valor", label: "Valor", type: "text" },
            ],
          },
          { name: "valorSemDesconto", label: "Valor sem desconto (R$)", type: "currency", required: true, width: "third", placeholder: "Ex.: 18.500,00" },
          { name: "valorDesconto", label: "Desconto (R$)", type: "currency", width: "third", defaultValue: "0" },
          {
            name: "pagamentos", label: "Sugestão de pagamento (% sobre o valor com desconto)", type: "array", addLabel: "Adicionar parcela",
            defaultRows: [
              { defaults: { percentual: 50, texto: "no ato da aprovação desta proposta e realização do levantamento de campo" } },
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
          { name: "textoPrazo", label: "Texto do prazo (Seção 7)", type: "textarea", required: true, width: "full", defaultValue: "O prazo total para elaboração, aprovação e entrega do projeto completo é de 6 (seis) meses, contados a partir da aprovação desta proposta e do recebimento da entrada contratual." },
          cronogramaField([
            { etapa: "Aprovação da proposta, contrato e 1ª parcela (50%)", prazo: "Dia D", responsavel: "Cliente + GTA" },
            { etapa: "Visita técnica de campo", prazo: "D + 1 a D + 7", responsavel: "GTA Energia" },
            { etapa: "Elaboração do projeto elétrico executivo completo da SE", prazo: "D + 7 a D + 35", responsavel: "GTA Energia" },
            { etapa: "Submissão do projeto à concessionária", prazo: "D + 35 a D + 40", responsavel: "GTA Energia" },
            { etapa: "Análise e aprovação pela concessionária (estimado)", prazo: "D + 40 a D + 80", responsavel: "Concessionária" },
            { etapa: "Revisões, adequações e obtenção da Autorização de Construção", prazo: "D + 80 a D + 87", responsavel: "GTA Energia" },
            { etapa: "Emissão da ART, entrega do dossiê técnico e 2ª parcela", prazo: "Até D + 90", responsavel: "GTA + Cliente" },
          ]),
          { name: "prazoTotal", label: "Prazo total (linha final)", type: "text", required: true, width: "half", defaultValue: "6 meses" },
          { name: "aceiteLocal", label: "Local no bloco de aceite", type: "text", required: true, width: "half", placeholder: "Ex.: Fazenda Rio Doce — Bela Vista de Goiás/GO" },
        ],
      },
    ],
  },
  zodSchema,
  map: (formData) => {
    const form = formData as Form;
    const semDesc = money(form.valorSemDesconto);
    const desconto = money(form.valorDesconto || "0");
    const totalN = semDesc.n - desconto.n;
    return {
      data: {
        ...identData(form, "SE"),
        subtitulo: form.subtitulo,
        clienteTitulo:
          form.tituloCabecalho?.trim() || `${form.clienteNome.toUpperCase()} — ${form.cidadeUf.toUpperCase()}`,
        localServico: form.localServico,
        objeto: form.objeto,
        prazoExecucao: form.prazoExecucao,
        concessionaria: form.concessionaria,
        textoObjeto: form.textoObjeto,
        textoDadosIntro: form.textoDadosIntro,
        textoPrazo: form.textoPrazo,
        nomeLocal: form.nomeLocal,
        cidadeLocal: form.cidadeLocal,
        potencia: form.potencia,
        tensaoMT: form.tensaoMT,
        correnteBT: form.correnteBT,
        parametros: form.parametros,
        servicos: form.servicos,
        valorSemDesconto: semDesc.fmt,
        valorDesconto: desconto.fmt,
        valorTotal: formatBRL(totalN),
        valorTotalExtenso: money(totalN).extenso,
        pagamentos: form.pagamentos.map((p, i) => ({
          linha: `${p.percentual}% ${p.texto} (${formatBRL((totalN * p.percentual) / 100)})${i === form.pagamentos.length - 1 ? "." : ";"}`,
        })),
        cronograma: form.cronograma,
        prazoTotal: form.prazoTotal,
        aceiteLocal: form.aceiteLocal,
        validadePorExtenso: `${form.validadeDias} (${numberToWords(form.validadeDias)})`,
      },
    };
  },
};

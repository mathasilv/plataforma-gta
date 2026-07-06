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

/** Serviço: Execução de Subestação (obra completa, cubículo). */

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
  potencia: naoVazio("Informe a potência (ex.: 750 kVA)"),
  tensaoMT: naoVazio("Informe a tensão MT (ex.: 13,8 kV)"),
  correnteBT: naoVazio("Informe a corrente BT (ex.: 1.139 A)"),
  parametros: z.array(z.object({ parametro: z.string(), valor: z.string() })).min(1),
  investimento: z
    .array(z.object({ num: z.string(), titulo: z.string(), descricao: z.string(), faturamento: z.string(), valor: z.string() }))
    .min(1),
  pagamentos: z.array(z.object({ parcela: z.string(), evento: z.string(), percentual: z.coerce.number() })).min(1),
  cronograma: cronogramaZod,
  prazoDias: z.coerce.number().int().min(1).default(120),
  prazoTotal: z.string().default("120 dias corridos"),
  aceiteNome: naoVazio("Informe o nome no aceite"),
  aceiteResponsavel: naoVazio("Informe o responsável no aceite"),
});

type Form = z.infer<typeof zodSchema>;

export const execucaoSeService: ServiceModule = {
  key: "execucao-se",
  label: "Execução de Subestação",
  description: "Execução completa de subestação de média tensão em cubículo.",
  icon: "⚙️",
  referencePrefix: "SE",
  validityDays: 30,
  templateFile: "src/services/execucao-se/template.docx",
  formSchema: {
    sections: [
      {
        title: "Identificação",
        fields: [
          ...identFields({ validadeDias: 30, formaPagamento: "60% entrada + 30% medições quinzenais + 10% conclusão" }),
          { name: "tituloCabecalho", label: "Linha do cliente no cabeçalho (opcional)", type: "text", width: "full" },
          { name: "localServico", label: "Local do serviço", type: "text", required: true, width: "full", placeholder: "Ex.: Zona Rural — Bela Vista de Goiás/GO" },
          { name: "subtitulo", label: "Subtítulo do cabeçalho", type: "text", required: true, width: "full", defaultValue: "EXECUÇÃO DE SUBESTAÇÃO DE MÉDIA TENSÃO  ·  750 kVA  ·  13,8 kV" },
          { name: "objeto", label: "Objeto", type: "text", required: true, width: "full", defaultValue: "Execução de Subestação de Média Tensão — 750 kVA — 13,8 kV / 380-220 V" },
          { name: "prazoExecucao", label: "Prazo de execução (cabeçalho)", type: "text", required: true, width: "half", defaultValue: "120 dias corridos após aprovação e entrega dos materiais (condicionado ao projeto aprovado)" },
          { name: "concessionaria", label: "Concessionária", type: "text", required: true, width: "half", defaultValue: "Equatorial Goiás" },
        ],
      },
      {
        title: "Dados técnicos",
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
              { defaults: { parametro: "Tensão Primária (MT)", valor: "13.800 V — 13,8 kV — trifásico" } },
              { defaults: { parametro: "Tensão Secundária (BT)", valor: "380 / 220 V — trifásico + neutro (4 fios) — Dyn11" } },
              { defaults: { parametro: "Corrente Nominal Secundária", valor: "In ≈ 1.139 A" } },
              { defaults: { parametro: "Categoria da UC", valor: "Grupo A4 — MT 13,8 kV" } },
              { defaults: { parametro: "Classe de Tensão dos Equipamentos", valor: "15 kV" } },
              { defaults: { parametro: "Local de Instalação", valor: "" } },
            ],
            itemFields: [
              { name: "parametro", label: "Parâmetro", type: "text" },
              { name: "valor", label: "Especificação", type: "text" },
            ],
          },
          { name: "textoObjeto", label: "Texto do objeto (Seção 1)", type: "textarea", required: true, width: "full", defaultValue: "A presente Proposta Técnica e Comercial tem por objeto a execução completa da Subestação de Energia, incluindo todos os serviços de engenharia, mão de obra especializada, mobilização de equipamentos e ferramental necessários à implantação integral da subestação." },
        ],
      },
      {
        title: "Investimento e pagamento",
        fields: [
          {
            name: "investimento", label: "Composição do investimento (Seção 6.1)", type: "array", addLabel: "Adicionar item",
            defaultRows: [
              { defaults: { num: "01", titulo: "Serviços de execução — Subestação", descricao: "Obra civil, instalação de equipamentos de MT e BT, aterramento, comissionamento, vistoria e entrega do dossiê técnico. Mão de obra e mobilização inclusos.", faturamento: "GTA Energia Ltda", valor: "" } },
              { defaults: { num: "02", titulo: "Equipamentos e materiais da subestação — fornecimento", descricao: "Transformador, cubículo, chave MT, para-raios, TCs, TPs, medidor, QGBT, cabos MT/BT, aterramento e demais componentes. Aquisição direta pelo cliente conforme projeto aprovado.", faturamento: "GTA Energia – Direto para o Cliente", valor: "" } },
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
              { defaults: { parcela: "1ª", evento: "Entrada — no ato da aprovação da proposta, assinatura do contrato e disponibilização dos equipamentos, para mobilização e início das atividades", percentual: 60 } },
              { defaults: { parcela: "2ª a N", evento: "Medições quinzenais conforme avanço físico dos serviços, documentadas por boletim de medição assinado por ambas as partes", percentual: 30 } },
              { defaults: { parcela: "Final", evento: "Saldo remanescente — após energização da subestação pela concessionária e entrega do dossiê técnico completo", percentual: 10 } },
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
          { name: "textoPrazo", label: "Texto do prazo (Seção 7)", type: "textarea", required: true, width: "full", defaultValue: "O prazo total de execução dos serviços é de 120 (cento e vinte) dias corridos, contados a partir do cumprimento simultâneo das condições contratuais." },
          { name: "prazoDias", label: "Prazo (dias) — usado nos avisos", type: "number", required: true, width: "third", defaultValue: 120 },
          { name: "prazoTotal", label: "Prazo total (linha final)", type: "text", required: true, width: "third", defaultValue: "120 dias corridos" },
          cronogramaField([
            { etapa: "Aprovação, contrato, 1ª parcela (60%) + projeto aprovado + equipamentos disponíveis", prazo: "Dia D", responsavel: "Cliente + GTA" },
            { etapa: "Mobilização, verificação dos equipamentos e preparação do canteiro de obras", prazo: "D + 1 a D + 10", responsavel: "GTA Energia" },
            { etapa: "Execução da obra civil — fundação e montagem do cubículo", prazo: "D + 10 a D + 35", responsavel: "GTA Energia" },
            { etapa: "Içamento e posicionamento do transformador + instalação dos equipamentos de MT", prazo: "D + 30 a D + 60", responsavel: "GTA Energia" },
            { etapa: "Instalação do sistema de medição (TCs, TPs, medidor) e conexões de MT", prazo: "D + 55 a D + 75", responsavel: "GTA Energia" },
            { etapa: "Instalação do QGBT e cabeamento de BT", prazo: "D + 70 a D + 90", responsavel: "GTA Energia" },
            { etapa: "Execução do aterramento completo com medição e registro", prazo: "D + 85 a D + 100", responsavel: "GTA Energia" },
            { etapa: "Comissionamento, vistoria da concessionária e energização supervisionada", prazo: "D + 100 a D + 115", responsavel: "GTA + Concessionária" },
            { etapa: "Entrega do dossiê técnico e pagamento do saldo final (10%)", prazo: "D + 120", responsavel: "GTA + Cliente" },
          ]),
          { name: "aceiteNome", label: "Nome no bloco de aceite", type: "text", required: true, width: "half" },
          { name: "aceiteResponsavel", label: "Responsável no aceite", type: "text", required: true, width: "half" },
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
        ...identData(form, "SE"),
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
        potencia: form.potencia,
        tensaoMT: form.tensaoMT,
        correnteBT: form.correnteBT,
        parametros: form.parametros,
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

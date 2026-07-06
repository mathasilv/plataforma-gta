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

/** Serviço: Inspeção e Diagnóstico de Subestação (termografia + proteção). */

const zodSchema = z.object({
  ...identZod,
  validadeDias: z.coerce.number().int().min(1).default(20),
  subtitulo: naoVazio("Informe o subtítulo").default(
    "INSPEÇÃO E DIAGNÓSTICO DE SUBESTAÇÃO  ·  ANÁLISE DE PROTEÇÃO  ·  TERMOGRAFIA",
  ),
  endereco: naoVazio("Informe o endereço"),
  objeto: naoVazio("Informe o objeto").default("Inspeção, Diagnóstico e Adequação de Proteção da Subestação"),
  prazoExecucao: z.string().default("15 dias corridos após aprovação e assinatura do contrato"),
  concessionaria: z.string().default("Equatorial Goiás"),
  textoObjeto: naoVazio("Informe o texto do objeto"),
  textoPrazo: naoVazio("Informe o texto do prazo"),
  servicos: z
    .array(z.object({ num: z.string(), descricao: z.string(), valor: z.string() }))
    .min(1)
    .default([
      { num: "01", descricao: "Inspeção visual completa da subestação com levantamento de parâmetros técnicos e registro fotográfico", valor: "—" },
      { num: "02", descricao: "Download e análise dos ajustes de proteção implementados — verificação de conformidade com carta de ajustes aprovada e análise de sobrecarga", valor: "—" },
      { num: "03", descricao: "Vistoria termográfica completa com câmera de alta resolução e emissão de relatório termográfico", valor: "—" },
      { num: "04", descricao: "Elaboração de novo estudo de proteção e implementação dos ajustes corretivos nos relés (quando necessário) — incluso no escopo", valor: "—" },
      { num: "05", descricao: "Relatório técnico completo de diagnóstico e adequação com parecer conclusivo e recomendações priorizadas", valor: "—" },
    ]),
  valorTotal: naoVazio("Informe o valor total"),
  pagamentos: z
    .array(z.object({ parcela: z.string(), evento: z.string(), percentual: z.coerce.number() }))
    .min(1)
    .default([
      { parcela: "1ª", evento: "No ato da assinatura do contrato — entrada para mobilização da equipe e início dos serviços", percentual: 50 },
      { parcela: "2ª", evento: "Após entrega e apresentação do relatório técnico completo de diagnóstico e adequação ao cliente", percentual: 50 },
    ]),
  cronograma: cronogramaZod.default([
    { etapa: "Aprovação, assinatura do contrato e pagamento da 1ª parcela", prazo: "Dia D", responsavel: "Cliente + GTA" },
    { etapa: "Mobilização e deslocamento da equipe técnica", prazo: "D + 3", responsavel: "GTA Energia" },
    { etapa: "Inspeção visual, levantamento técnico e vistoria termográfica", prazo: "D + 3 a D + 5", responsavel: "GTA Energia" },
    { etapa: "Download e análise dos ajustes de proteção + análise de sobrecarga", prazo: "D + 5 a D + 8", responsavel: "GTA Energia" },
    { etapa: "Elaboração de novo estudo de proteção e implementação (se necessário)", prazo: "D + 8 a D + 11", responsavel: "GTA Energia" },
    { etapa: "Elaboração e revisão do relatório técnico completo de diagnóstico", prazo: "D + 11 a D + 14", responsavel: "GTA Energia" },
    { etapa: "Entrega e apresentação do relatório ao cliente + 2ª parcela", prazo: "D + 15", responsavel: "GTA + Cliente" },
  ]),
  prazoTotal: z.string().default("15 dias corridos"),
});

type Form = z.infer<typeof zodSchema>;

export const inspecaoSeService: ServiceModule = {
  key: "inspecao-se",
  label: "Inspeção de Subestação",
  description: "Diagnóstico de subestação: análise de proteção, sobrecarga e termografia.",
  icon: "🔍",
  referencePrefix: "SE",
  validityDays: 20,
  templateFile: "src/services/inspecao-se/template.docx",
  formSchema: {
    sections: [
      {
        title: "Identificação",
        fields: [
          ...identFields({ validadeDias: 20, formaPagamento: "50% na entrada + 50% após entrega do relatório" }),
          { name: "endereco", label: "Endereço do cliente", type: "text", required: true, width: "full", placeholder: "Ex.: Vila Industrial — Anápolis/GO — CEP: 75115-100" },
          { name: "subtitulo", label: "Subtítulo do cabeçalho", type: "text", required: true, width: "full", defaultValue: "INSPEÇÃO E DIAGNÓSTICO DE SUBESTAÇÃO  ·  ANÁLISE DE PROTEÇÃO  ·  TERMOGRAFIA" },
          { name: "objeto", label: "Objeto", type: "text", required: true, width: "full", defaultValue: "Inspeção, Diagnóstico e Adequação de Proteção da Subestação" },
          { name: "prazoExecucao", label: "Prazo de execução (cabeçalho)", type: "text", required: true, width: "half", defaultValue: "15 dias corridos após aprovação e assinatura do contrato" },
          { name: "concessionaria", label: "Concessionária", type: "text", required: true, width: "half", defaultValue: "Equatorial Goiás" },
        ],
      },
      {
        title: "Objeto e escopo",
        fields: [
          { name: "textoObjeto", label: "Texto do objeto (Seção 1)", type: "textarea", required: true, width: "full", defaultValue: "A presente Proposta Técnica e Comercial tem por objeto a realização de inspeção técnica especializada na subestação de energia elétrica do cliente, com foco no diagnóstico das condições operacionais, análise de conformidade dos ajustes de proteção em relação à potência instalada, vistoria termográfica para identificação de pontos quentes e, quando necessário, elaboração de novo estudo de proteção e implementação dos ajustes corretivos." },
          {
            name: "servicos", label: "Itens da tabela de serviços", type: "array", addLabel: "Adicionar item",
            defaultRows: [
              { defaults: { num: "01", descricao: "Inspeção visual completa da subestação com levantamento de parâmetros técnicos e registro fotográfico", valor: "—" } },
              { defaults: { num: "02", descricao: "Download e análise dos ajustes de proteção implementados — verificação de conformidade com carta de ajustes aprovada e análise de sobrecarga", valor: "—" } },
              { defaults: { num: "03", descricao: "Vistoria termográfica completa com câmera de alta resolução e emissão de relatório termográfico", valor: "—" } },
              { defaults: { num: "04", descricao: "Elaboração de novo estudo de proteção e implementação dos ajustes corretivos nos relés (quando necessário) — incluso no escopo", valor: "—" } },
              { defaults: { num: "05", descricao: "Relatório técnico completo de diagnóstico e adequação com parecer conclusivo e recomendações priorizadas", valor: "—" } },
            ],
            itemFields: [
              { name: "num", label: "#", type: "text" },
              { name: "descricao", label: "Descrição", type: "text" },
              { name: "valor", label: "Valor", type: "text" },
            ],
          },
        ],
      },
      {
        title: "Valores e pagamento",
        fields: [
          { name: "valorTotal", label: "Valor total (R$)", type: "currency", required: true, width: "half", placeholder: "Ex.: 15.000,00" },
          {
            name: "pagamentos", label: "Parcelas", type: "array", addLabel: "Adicionar parcela",
            defaultRows: [
              { defaults: { parcela: "1ª", evento: "No ato da assinatura do contrato — entrada para mobilização da equipe e início dos serviços", percentual: 50 } },
              { defaults: { parcela: "2ª", evento: "Após entrega e apresentação do relatório técnico completo de diagnóstico e adequação ao cliente", percentual: 50 } },
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
          { name: "textoPrazo", label: "Texto do prazo (Seção 5)", type: "textarea", required: true, width: "full", defaultValue: "O prazo total de execução é de 15 (quinze) dias corridos, contados a partir da data de aprovação desta proposta, assinatura do contrato e recebimento da entrada contratual." },
          cronogramaField([
            { etapa: "Aprovação, assinatura do contrato e pagamento da 1ª parcela", prazo: "Dia D", responsavel: "Cliente + GTA" },
            { etapa: "Mobilização e deslocamento da equipe técnica", prazo: "D + 3", responsavel: "GTA Energia" },
            { etapa: "Inspeção visual, levantamento técnico e vistoria termográfica", prazo: "D + 3 a D + 5", responsavel: "GTA Energia" },
            { etapa: "Download e análise dos ajustes de proteção + análise de sobrecarga", prazo: "D + 5 a D + 8", responsavel: "GTA Energia" },
            { etapa: "Elaboração de novo estudo de proteção e implementação (se necessário)", prazo: "D + 8 a D + 11", responsavel: "GTA Energia" },
            { etapa: "Elaboração e revisão do relatório técnico completo de diagnóstico", prazo: "D + 11 a D + 14", responsavel: "GTA Energia" },
            { etapa: "Entrega e apresentação do relatório ao cliente + 2ª parcela", prazo: "D + 15", responsavel: "GTA + Cliente" },
          ]),
          { name: "prazoTotal", label: "Prazo total (linha final)", type: "text", required: true, width: "half", defaultValue: "15 dias corridos" },
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
        ...identData(form, "SE"),
        subtitulo: form.subtitulo,
        clienteTitulo: `${form.clienteNome.toUpperCase()} — ${form.cidadeUf.toUpperCase()}`,
        endereco: form.endereco,
        objeto: form.objeto,
        prazoExecucao: form.prazoExecucao,
        concessionaria: form.concessionaria,
        textoObjeto: form.textoObjeto,
        textoPrazo: form.textoPrazo,
        servicos: form.servicos,
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

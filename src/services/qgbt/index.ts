import { z } from "zod";
import type { ServiceModule } from "../types";
import { identData, identFields, identZod, money, naoVazio } from "../_shared";
import { capitalize, formatBRL, moneyToWords, numberToWords } from "@/lib/format";

/** Serviço: Fornecimento de QGBT (quadro montado, identificado e testado). */

const zodSchema = z.object({
  ...identZod,
  validadeDias: z.coerce.number().int().min(1).default(20),
  subtitulo: naoVazio("Informe o subtítulo").default(
    "QUADRO GERAL DE BAIXA TENSÃO (QGBT)  ·  TRIFÁSICO  ·  CONFORME ESPECIFICAÇÃO DO CLIENTE",
  ),
  endereco: naoVazio("Informe o endereço"),
  tituloCabecalho: z.string().optional().default(""),
  objeto: naoVazio("Informe o objeto").default("Fornecimento de QGBT — Baixa Tensão Trifásico — Conforme Especificação"),
  textoObjeto: naoVazio("Informe o texto do objeto"),
  textoPrazo: naoVazio("Informe o texto do prazo"),
  descricaoFornecimento: naoVazio("Informe a descrição do fornecimento"),
  valorFornecimento: naoVazio("Informe o valor do fornecimento"),
  valorEncargos: naoVazio("Informe o valor dos encargos"),
  parametros: z
    .array(z.object({ parametro: z.string(), valor: z.string() }))
    .min(1)
    .default([
      { parametro: "Tipo de Quadro", valor: "QGBT — Quadro Geral de Baixa Tensão" },
      { parametro: "Sistema", valor: "Trifásico + Neutro — 380/220V — 60Hz" },
      { parametro: "Invólucro / Armário", valor: "" },
      { parametro: "Grau de Proteção", valor: "" },
      { parametro: "Proteção Geral", valor: "" },
      { parametro: "Normas", valor: "ABNT NBR IEC 61439-1 e 61439-2" },
      { parametro: "Entrega", valor: "Quadro montado, identificado e testado" },
    ]),
  materiais: z
    .array(z.object({ identificacao: z.string(), descricao: z.string(), marca: z.string() }))
    .min(1)
    .default([{ identificacao: "", descricao: "", marca: "" }]),
  pagamentos: z
    .array(z.object({ percentual: z.coerce.number(), texto: z.string() }))
    .min(1)
    .default([
      { percentual: 50, texto: "no ato da aprovação do orçamento e confirmação do pedido — entrada para aquisição dos materiais" },
      { percentual: 50, texto: "na entrega do quadro testado e aprovado" },
    ]),
  aceiteLocal: naoVazio("Informe o local do aceite"),
});

type Form = z.infer<typeof zodSchema>;

export const qgbtService: ServiceModule = {
  key: "qgbt",
  label: "Fornecimento de QGBT",
  description: "Quadro Geral de Baixa Tensão montado, identificado e testado em bancada.",
  icon: "🔌",
  referencePrefix: "QGBT",
  validityDays: 20,
  templateFile: "src/services/qgbt/template.docx",
  formSchema: {
    sections: [
      {
        title: "Identificação",
        fields: [
          ...identFields({ validadeDias: 20 }),
          { name: "endereco", label: "Endereço do cliente", type: "text", required: true, width: "full", placeholder: "Ex.: Via Principal 1, s/n — DAIA, Anápolis/GO" },
          { name: "tituloCabecalho", label: "Linha do cliente no cabeçalho (opcional)", type: "text", width: "full", help: "Deixe em branco para usar NOME — CIDADE/UF automático." },
          { name: "subtitulo", label: "Subtítulo do cabeçalho", type: "text", required: true, width: "full", defaultValue: "QUADRO GERAL DE BAIXA TENSÃO (QGBT)  ·  TRIFÁSICO  ·  CONFORME ESPECIFICAÇÃO DO CLIENTE" },
          { name: "objeto", label: "Objeto", type: "text", required: true, width: "full", defaultValue: "Fornecimento de QGBT — Baixa Tensão Trifásico — Conforme Especificação" },
          { name: "aceiteLocal", label: "Local no bloco de aceite", type: "text", required: true, width: "half", placeholder: "Ex.: DAIA — Anápolis/GO" },
        ],
      },
      {
        title: "Objeto e especificação",
        fields: [
          { name: "textoObjeto", label: "Texto do objeto (Seção 1)", type: "textarea", required: true, width: "full", defaultValue: "O presente Orçamento tem por objeto o fornecimento do Quadro Geral de Baixa Tensão (QGBT) para instalação trifásica de baixa tensão, conforme especificação técnica de materiais e componentes fornecida pelo cliente." },
          {
            name: "parametros", label: "Características gerais (tabela 2.1)", type: "array", addLabel: "Adicionar parâmetro",
            defaultRows: [
              { defaults: { parametro: "Tipo de Quadro", valor: "QGBT — Quadro Geral de Baixa Tensão" } },
              { defaults: { parametro: "Sistema", valor: "Trifásico + Neutro — 380/220V — 60Hz" } },
              { defaults: { parametro: "Invólucro / Armário", valor: "" } },
              { defaults: { parametro: "Grau de Proteção", valor: "" } },
              { defaults: { parametro: "Proteção Geral", valor: "" } },
              { defaults: { parametro: "Normas", valor: "ABNT NBR IEC 61439-1 e 61439-2" } },
              { defaults: { parametro: "Entrega", valor: "Quadro montado, identificado e testado" } },
            ],
            itemFields: [
              { name: "parametro", label: "Parâmetro", type: "text" },
              { name: "valor", label: "Especificação", type: "text" },
            ],
          },
          {
            name: "materiais", label: "Lista de materiais (tabela 2.2)", type: "array", addLabel: "Adicionar material",
            itemFields: [
              { name: "identificacao", label: "Identificação", type: "text" },
              { name: "descricao", label: "Descrição", type: "text" },
              { name: "marca", label: "Marca / linha", type: "text" },
            ],
          },
        ],
      },
      {
        title: "Valores e pagamento",
        fields: [
          { name: "descricaoFornecimento", label: "Descrição da linha de fornecimento (tabela 4.1)", type: "text", required: true, width: "full", placeholder: "Ex.: Quadro Painel ... completo, montado, identificado e testado em bancada." },
          { name: "valorFornecimento", label: "Valor fornecimento/montagem (R$)", type: "currency", required: true, width: "half", placeholder: "Ex.: 27.795,00" },
          { name: "valorEncargos", label: "Valor encargos fiscais (R$)", type: "currency", required: true, width: "half", placeholder: "Ex.: 4.905,00" },
          {
            name: "pagamentos", label: "Sugestão de pagamento", type: "array", addLabel: "Adicionar parcela",
            defaultRows: [
              { defaults: { percentual: 50, texto: "no ato da aprovação do orçamento e confirmação do pedido — entrada para aquisição dos materiais" } },
              { defaults: { percentual: 50, texto: "na entrega do quadro testado e aprovado" } },
            ],
            itemFields: [
              { name: "percentual", label: "%", type: "number", width: "third" },
              { name: "texto", label: "Condição", type: "text" },
            ],
          },
        ],
      },
      {
        title: "Prazo",
        fields: [
          { name: "textoPrazo", label: "Texto do prazo (Seção 5)", type: "textarea", required: true, width: "full", defaultValue: "O prazo de entrega do QGBT montado, identificado e testado será definido após confirmação do pedido e recebimento da entrada, conforme disponibilidade de componentes no mercado. O prazo estimado é de 15 a 20 dias úteis após a confirmação do pedido." },
        ],
      },
    ],
  },
  zodSchema,
  map: (formData) => {
    const form = formData as Form;
    const fornecimento = money(form.valorFornecimento);
    const encargos = money(form.valorEncargos);
    const totalN = fornecimento.n + encargos.n;
    return {
      data: {
        ...identData(form, "QGBT"),
        subtitulo: form.subtitulo,
        clienteTitulo:
          form.tituloCabecalho?.trim() ||
          `${form.clienteNome.toUpperCase()} — ${form.cidadeUf.toUpperCase()}`,
        endereco: form.endereco,
        objeto: form.objeto,
        textoObjeto: form.textoObjeto,
        textoPrazo: form.textoPrazo,
        descricaoFornecimento: form.descricaoFornecimento,
        valorFornecimento: fornecimento.fmt,
        valorEncargos: encargos.fmt,
        valorTotal: formatBRL(totalN),
        valorTotalExtenso: `${capitalize(moneyToWords(totalN))} (sendo ${fornecimento.fmt} de fornecimento/serviços e ${encargos.fmt} de encargos fiscais).`,
        parametros: form.parametros,
        materiais: form.materiais,
        pagamentos: form.pagamentos.map((p, i) => ({
          linha: `${p.percentual}% ${p.texto} (${formatBRL((totalN * p.percentual) / 100)})${i === form.pagamentos.length - 1 ? "." : ";"}`,
        })),
        aceiteLocal: form.aceiteLocal,
        validadePorExtenso: `${form.validadeDias} (${numberToWords(form.validadeDias)})`,
      },
    };
  },
};

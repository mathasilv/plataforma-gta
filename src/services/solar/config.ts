import { z } from "zod";
import type { FormSchema } from "../types";
import { DISTRIBUIDORES, MESES } from "./presets";

/**
 * Definição do formulário dinâmico do serviço Solar + schema de validação.
 * O DynamicForm renderiza a partir de `solarFormSchema`; a API valida com `solarZodSchema`.
 */

const OBJETIVO_PADRAO =
  "A presente proposta tem como objetivo a implantação de um sistema de microgeração de energia solar fotovoltaica conectada à rede elétrica (On-Grid) na residência do(a) cliente, em sua localidade, proporcionando redução nos custos com energia elétrica através da geração própria de energia limpa e renovável.";

const OBSERVACAO_PADRAO =
  "Para o pleno funcionamento e atingimento da geração de energia estimada, é necessário que o telhado possua uma área útil mínima compatível com orientação voltada para o Norte. Caso essas condições estruturais e de orientação não sejam integralmente atendidas, a geração real de energia poderá divergir dos valores previstos na simulação.";

// Linhas fixas da simulação: 12 meses (energia/consumo em branco para colar)
const simulacaoRows = MESES.map((mes) => ({
  defaults: { mes, insolacao: "", energia: "", consumo: "" },
}));

export const solarFormSchema: FormSchema = {
  sections: [
    {
      title: "Identificação",
      fields: [
        { name: "clienteNome", label: "Nome do cliente", type: "text", required: true, width: "half", placeholder: "Ex.: Maria Selma" },
        { name: "cidadeUf", label: "Cidade/UF", type: "text", required: true, width: "half", placeholder: "Ex.: Goiânia/GO", defaultValue: "Goiânia/GO" },
        { name: "objeto", label: "Objeto", type: "text", required: true, width: "full", defaultValue: "Implantação de Sistema de Microgeração Solar Fotovoltaica On-Grid" },
        { name: "subtitulo", label: "Subtítulo do cabeçalho", type: "text", required: true, width: "full", defaultValue: "SISTEMA FOTOVOLTAICO CONECTADO À REDE  ·  MICROGERAÇÃO SOLAR ON-GRID" },
        { name: "referenciaSeq", label: "Nº sequencial da referência", type: "number", required: true, width: "third", defaultValue: 1, help: "Compõe o código GTA-ANO-CLIENTE-SOLAR-00N" },
        { name: "dataEmissao", label: "Data de emissão", type: "date", required: true, width: "third" },
        { name: "validadeDias", label: "Validade (dias)", type: "number", required: true, width: "third", defaultValue: 20 },
        { name: "formaPagamento", label: "Forma de pagamento", type: "text", required: true, width: "full", defaultValue: "A combinar" },
      ],
    },
    {
      title: "Objetivo",
      fields: [
        { name: "textoObjetivo", label: "Texto do objetivo", type: "textarea", required: true, width: "full", defaultValue: OBJETIVO_PADRAO },
      ],
    },
    {
      title: "Dimensionamento do sistema",
      fields: [
        { name: "potenciaPainel", label: "Potência do painel", type: "text", required: true, width: "third", placeholder: "Ex.: 630 W" },
        { name: "qtdPaineis", label: "Quantidade de painéis", type: "text", required: true, width: "third", placeholder: "Ex.: 12 unidades" },
        { name: "potenciaTotal", label: "Potência total", type: "text", required: true, width: "third", placeholder: "Ex.: 7,56 kWp" },
        { name: "potenciaInversor", label: "Potência do inversor", type: "text", required: true, width: "third", placeholder: "Ex.: 6 kWp" },
        { name: "overload", label: "Overload", type: "text", required: true, width: "third", placeholder: "Ex.: 26,00%" },
        { name: "qtdInversores", label: "Quantidade de inversores", type: "text", required: true, width: "third", placeholder: "Ex.: 1 unidade" },
        {
          name: "tipoInversor", label: "Tipo", type: "select", required: true, width: "full", defaultValue: "inversor",
          options: [
            { value: "inversor", label: "Inversor" },
            { value: "microinversor", label: "Microinversor" },
          ],
          help: "Ajusta os rótulos da tabela (Inversor × Microinversor).",
        },
      ],
    },
    {
      title: "Simulação de geração (12 meses)",
      description: "Cole os valores já calculados. Os totais anuais são somados automaticamente.",
      fields: [
        {
          name: "simulacao", label: "Meses", type: "array",
          fixedRows: simulacaoRows,
          itemFields: [
            { name: "mes", label: "Mês", type: "text" },
            { name: "insolacao", label: "Insolação (kWh/m²·dia)", type: "text" },
            { name: "energia", label: "Energia produzida (kWh)", type: "text" },
            { name: "consumo", label: "Consumo (kWh)", type: "text" },
          ],
        },
        { name: "textoObservacao", label: "Observação técnica", type: "textarea", required: true, width: "full", defaultValue: OBSERVACAO_PADRAO },
      ],
    },
    {
      title: "Composição do sistema (materiais)",
      fields: [
        {
          name: "materiais", label: "Materiais e equipamentos", type: "array", addLabel: "Adicionar material",
          itemFields: [
            { name: "qtde", label: "Qtde.", type: "text", width: "third" },
            { name: "descricao", label: "Descrição do sistema solar", type: "text" },
          ],
        },
      ],
    },
    {
      title: "Distribuidor e investimento",
      fields: [
        {
          name: "distribuidor", label: "Distribuidor do kit", type: "select", required: true, width: "half", defaultValue: "weg",
          options: DISTRIBUIDORES.map((d) => ({ value: d.value, label: d.label })),
          help: "Define a garantia técnica e o nome no faturamento.",
        },
        { name: "distribuidorNome", label: "Nome do distribuidor (faturamento)", type: "text", width: "half", help: "Deixe em branco para usar o padrão do distribuidor selecionado." },
        { name: "distribuidorCnpj", label: "CNPJ do distribuidor", type: "text", width: "half", help: "Deixe em branco para usar o padrão." },
        { name: "kitItens", label: "Itens do kit (texto)", type: "text", width: "half", defaultValue: "módulos, inversor, estrutura e cabos" },
        { name: "valorKit", label: "Valor do kit (distribuidor)", type: "currency", required: true, width: "half", placeholder: "Ex.: 10.888,67" },
        { name: "valorGta", label: "Valor GTA (serviços)", type: "currency", required: true, width: "half", placeholder: "Ex.: 7.622,07" },
      ],
    },
    {
      title: "Prazo",
      fields: [
        { name: "prazoExecucao", label: "Prazo de execução", type: "text", required: true, width: "half", defaultValue: "45 a 60 dias" },
      ],
    },
  ],
};

// ----- Schema de validação (Zod) -------------------------------------------

const naoVazio = (msg: string) => z.string().min(1, msg);

export const solarZodSchema = z.object({
  clienteNome: naoVazio("Informe o nome do cliente"),
  cidadeUf: naoVazio("Informe a cidade/UF"),
  objeto: naoVazio("Informe o objeto"),
  subtitulo: naoVazio("Informe o subtítulo"),
  referenciaSeq: z.coerce.number().int().min(1),
  dataEmissao: naoVazio("Informe a data de emissão"),
  validadeDias: z.coerce.number().int().min(1),
  formaPagamento: naoVazio("Informe a forma de pagamento"),
  textoObjetivo: naoVazio("Informe o texto do objetivo"),
  potenciaPainel: naoVazio("Informe a potência do painel"),
  qtdPaineis: naoVazio("Informe a quantidade de painéis"),
  potenciaTotal: naoVazio("Informe a potência total"),
  potenciaInversor: naoVazio("Informe a potência do inversor"),
  overload: naoVazio("Informe o overload"),
  qtdInversores: naoVazio("Informe a quantidade de inversores"),
  tipoInversor: z.enum(["inversor", "microinversor"]),
  simulacao: z
    .array(
      z.object({
        mes: z.string(),
        insolacao: z.string(),
        energia: z.string(),
        consumo: z.string(),
      }),
    )
    .length(12),
  textoObservacao: naoVazio("Informe a observação técnica"),
  materiais: z
    .array(z.object({ qtde: z.string(), descricao: z.string() }))
    .min(1, "Adicione ao menos um material"),
  distribuidor: z.enum(["weg", "belenergy", "outro"]),
  distribuidorNome: z.string().optional().default(""),
  distribuidorCnpj: z.string().optional().default(""),
  kitItens: naoVazio("Informe os itens do kit"),
  valorKit: naoVazio("Informe o valor do kit"),
  valorGta: naoVazio("Informe o valor GTA"),
  prazoExecucao: naoVazio("Informe o prazo de execução"),
});

export type SolarFormData = z.infer<typeof solarZodSchema>;

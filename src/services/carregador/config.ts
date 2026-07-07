import { z } from "zod";

/**
 * Schema de validação dos dados que o CarregadorConfigurator envia para a
 * geração do .docx (molde solar-style: cabeçalho, dimensionamento, escopo,
 * materiais, investimento, prazo). O dimensionamento (NBR 5410) vai no objeto
 * `sizing`; a lista de materiais (BOM) vai em `materiais`.
 */

const naoVazio = (msg: string) => z.string().min(1, msg);

export const sizingSchema = z.object({
  tensao: z.number(),
  correnteNominal: z.number(),
  correnteProjeto: z.number(),
  disjuntorA: z.number(),
  polos: z.number(),
  secaoMm2: z.number(),
  quedaPct: z.number(),
  nCondutores: z.number(),
  nDps: z.number(),
  eletroduto: z.string(),
  drTipo: z.enum(["A", "B"]),
});

export const carregadorZodSchema = z.object({
  clienteNome: naoVazio("Informe o nome do cliente"),
  cidadeUf: naoVazio("Informe a cidade/UF"),
  referenciaSeq: z.coerce.number().int().min(1),
  dataEmissao: naoVazio("Informe a data de emissão"),
  validadeDias: z.coerce.number().int().min(1),
  formaPagamento: naoVazio("Informe a forma de pagamento"),

  subtitulo: naoVazio("Informe o subtítulo"),
  objeto: naoVazio("Informe o objeto"),
  textoObjetivo: naoVazio("Informe o texto do objetivo"),

  potenciaKw: naoVazio("Informe a potência"),
  sizing: sizingSchema,

  materiais: z
    .array(z.object({ qtde: z.string(), descricao: z.string() }))
    .min(1, "A lista de materiais está vazia"),

  valorServico: naoVazio("Informe o valor do serviço"),
  valorEquipamento: z.string().optional().default("0"),

  prazoExecucao: naoVazio("Informe o prazo de execução"),
});

export type CarregadorFormData = z.infer<typeof carregadorZodSchema>;

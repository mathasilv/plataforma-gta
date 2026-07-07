import type { z } from "zod";

/**
 * Contrato de um serviço da plataforma.
 *
 * Cada serviço vive em sua própria pasta (ex.: src/services/solar) e exporta um
 * objeto `ServiceModule`. Para adicionar um serviço novo, basta criar a pasta,
 * o molde .docx e cumprir este contrato — o núcleo (formulário dinâmico e motor
 * de geração) não muda.
 */

export type FieldType =
  | "text"
  | "textarea"
  | "number"
  | "currency"
  | "select"
  | "date"
  | "array";

export interface SelectOption {
  value: string;
  label: string;
}

export interface FieldDef {
  /** Nome do campo (chave nos dados do formulário) */
  name: string;
  /** Rótulo exibido no formulário */
  label: string;
  type: FieldType;
  required?: boolean;
  placeholder?: string;
  /** Texto de ajuda abaixo do campo */
  help?: string;
  /** Valor padrão pré-preenchido */
  defaultValue?: unknown;
  /** Largura no grid do formulário */
  width?: "full" | "half" | "third";
  /** Opções para type: "select" */
  options?: SelectOption[];
  /** Subcampos por linha, para type: "array" */
  itemFields?: FieldDef[];
  /** Rótulo do botão "adicionar linha" (array) */
  addLabel?: string;
  /**
   * Linhas fixas para type: "array" (ex.: 12 meses). Quando definido, o número
   * de linhas é fixo e não pode ser adicionado/removido.
   */
  fixedRows?: { defaults: Record<string, unknown> }[];
  /**
   * Linhas pré-preenchidas para type: "array" que PODEM ser editadas,
   * removidas e acrescidas (ex.: cronograma com etapas padrão).
   */
  defaultRows?: { defaults: Record<string, unknown> }[];
}

export interface FormSection {
  /** Título da seção do formulário */
  title: string;
  description?: string;
  fields: FieldDef[];
}

export interface FormSchema {
  sections: FormSection[];
}

/** Dados achatados prontos para o docxtemplater preencher o molde. */
export type TemplateData = Record<string, unknown>;

export interface MapResult {
  /** Dados para os marcadores do molde (docxtemplater) */
  data: TemplateData;
  /**
   * Patch opcional de partes internas do .docx (ex.: valores do gráfico nativo).
   * Recebe o PizZip do documento já renderizado e o modifica no lugar.
   */
  patch?: (zip: import("pizzip")) => void;
}

export interface ServiceModule {
  /** Identificador único (usado em URLs e no banco) */
  key: string;
  /** Nome exibido nos cards e títulos */
  label: string;
  /** Descrição curta para o card do dashboard */
  description: string;
  /** Emoji/ícone para o card */
  icon: string;
  /** Prefixo do código de referência (ex.: "SOLAR" -> GTA-2026-CLIENTE-SOLAR-00N) */
  referencePrefix: string;
  /** Validade padrão da proposta em dias corridos */
  validityDays: number;
  /** Caminho do molde .docx relativo à raiz do projeto */
  templateFile: string;
  /**
   * Se true, a tela usa um configurador próprio (ex.: Solar/CPQ) em vez do
   * formulário dinâmico genérico. A geração do .docx continua igual.
   */
  usesConfigurator?: boolean;
  /** Definição do formulário dinâmico */
  formSchema: FormSchema;
  /** Schema de validação (Zod) dos dados do formulário */
  zodSchema: z.ZodTypeAny;
  /** Transforma dados do formulário em dados do molde (+ patch opcional) */
  map: (formData: Record<string, unknown>) => MapResult;
}

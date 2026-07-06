import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";

/**
 * Motor genérico de geração de .docx.
 *
 * Recebe o molde (.docx com marcadores `{campo}` e loops `{#lista}...{/lista}`),
 * os dados achatados e um patch opcional (para alterar partes internas do zip,
 * como os valores do gráfico nativo). Devolve o Buffer do .docx final.
 *
 * Não recria o layout: preenche o molde real, então fonte, logo, cabeçalho,
 * rodapé e tabelas ficam idênticos ao documento original.
 */
export function renderDocx(
  templateBuffer: Buffer,
  data: Record<string, unknown>,
  patch?: (zip: PizZip) => void,
): Buffer {
  const zip = new PizZip(templateBuffer);

  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    delimiters: { start: "{", end: "}" },
    // Marcadores sem valor viram string vazia em vez de quebrar a renderização
    nullGetter: () => "",
  });

  try {
    doc.render(data);
  } catch (err) {
    throw formatTemplateError(err);
  }

  const renderedZip = doc.getZip();

  // Patch de partes internas (ex.: dados do gráfico nativo) após a renderização
  if (patch) {
    patch(renderedZip);
  }

  return renderedZip.generate({
    type: "nodebuffer",
    compression: "DEFLATE",
  }) as Buffer;
}

/** Transforma erros do docxtemplater em mensagem legível. */
function formatTemplateError(err: unknown): Error {
  const e = err as {
    properties?: { errors?: Array<{ properties?: { explanation?: string } }> };
    message?: string;
  };
  if (e?.properties?.errors?.length) {
    const detalhes = e.properties.errors
      .map((x) => x.properties?.explanation)
      .filter(Boolean)
      .join("; ");
    return new Error(`Erro no molde .docx: ${detalhes}`);
  }
  return new Error(e?.message ?? "Erro desconhecido ao gerar o documento");
}

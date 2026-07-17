/**
 * Armazenamento físico da foto de perfil. Vercel Blob em produção (quando
 * BLOB_READ_WRITE_TOKEN existe, acesso público — é só uma foto de perfil,
 * sem necessidade de rota de download autenticada como os anexos de
 * orçamento). Em desenvolvimento (sem Blob configurado), grava como data URL
 * direto no valor salvo — simples o bastante para teste local, nunca usado
 * em produção.
 */

function usaBlob(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

function extensaoDe(contentType: string): string {
  if (contentType === "image/png") return "png";
  if (contentType === "image/webp") return "webp";
  if (contentType === "image/gif") return "gif";
  return "jpg";
}

/** Salva a foto e devolve a URL pública + se está no Blob (para saber se dá pra remover depois). */
export async function salvarAvatar(userId: string, contentType: string, bytes: Buffer): Promise<{ url: string; blob: boolean }> {
  if (usaBlob()) {
    const { put } = await import("@vercel/blob");
    const res = await put(`avatares/${userId}.${extensaoDe(contentType)}`, bytes, {
      access: "public",
      addRandomSuffix: true,
      contentType,
    });
    return { url: res.url, blob: true };
  }
  return { url: `data:${contentType};base64,${bytes.toString("base64")}`, blob: false };
}

/** Remove a foto anterior do Blob (best-effort). Data URL local não precisa de limpeza. */
export async function removerAvatar(url: string, blob: boolean): Promise<void> {
  if (!blob || !url) return;
  try {
    const { del } = await import("@vercel/blob");
    await del(url);
  } catch {
    // best-effort — se falhar, o arquivo antigo só fica órfão no Blob
  }
}

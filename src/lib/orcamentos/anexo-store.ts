import fs from "node:fs";
import path from "node:path";
import type { AnexoRef } from "./types";

/**
 * Armazenamento físico dos anexos. Vercel Blob em produção (quando
 * BLOB_READ_WRITE_TOKEN existe), filesystem local em desenvolvimento.
 * O download SEMPRE passa pela rota autenticada — o cliente nunca vê a URL crua,
 * e o Blob usa `addRandomSuffix` (URL não adivinhável).
 */

function usaBlob(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

const DIR_LOCAL = path.join(process.cwd(), "data", "uploads");

function sanitizarNome(nome: string): string {
  return (
    nome
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^\w.\-]+/g, "_")
      .slice(-80) || "arquivo"
  );
}

/** Salva o arquivo e devolve a referência de armazenamento (url + flag blob). */
export async function salvarAnexo(
  orcamentoId: string,
  anexoId: string,
  nome: string,
  contentType: string,
  bytes: Buffer,
): Promise<{ url: string; blob: boolean }> {
  const safeNome = sanitizarNome(nome);
  const chave = `orcamentos/${orcamentoId}/${anexoId}-${safeNome}`;
  if (usaBlob()) {
    const { put } = await import("@vercel/blob");
    const res = await put(chave, bytes, { access: "public", addRandomSuffix: true, contentType });
    return { url: res.url, blob: true };
  }
  // dev: grava em data/uploads/<orcamentoId>/<anexoId>-<nome>; url = caminho relativo interno
  const destDir = path.join(DIR_LOCAL, orcamentoId);
  fs.mkdirSync(destDir, { recursive: true });
  const destPath = path.join(destDir, `${anexoId}-${safeNome}`);
  fs.writeFileSync(destPath, bytes);
  return { url: path.relative(DIR_LOCAL, destPath).split(path.sep).join("/"), blob: false };
}

/**
 * Remove o arquivo do armazenamento. Retorna `true` se a remoção foi confirmada,
 * `false` se falhou (o chamador deve preservar a referência para tentar de novo).
 */
export async function removerAnexo(anexo: AnexoRef): Promise<boolean> {
  try {
    if (anexo.blob) {
      const { del } = await import("@vercel/blob");
      await del(anexo.url);
    } else {
      fs.rmSync(path.join(DIR_LOCAL, anexo.url), { force: true });
    }
    return true;
  } catch {
    return false;
  }
}

/** Lê o conteúdo do anexo para o download. */
export async function lerAnexo(anexo: AnexoRef): Promise<Buffer> {
  if (anexo.blob) {
    const res = await fetch(anexo.url);
    if (!res.ok) throw new Error(`Falha ao ler anexo (HTTP ${res.status})`);
    return Buffer.from(await res.arrayBuffer());
  }
  return fs.promises.readFile(path.join(DIR_LOCAL, anexo.url));
}

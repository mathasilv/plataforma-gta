/**
 * Cliente do Microsoft Graph (OneDrive for Business / SharePoint) — fluxo
 * APP-ONLY (client credentials). DORMENTE por padrão: se as variáveis de
 * ambiente não estiverem definidas, `oneDriveConfigurado()` retorna false e
 * nada é chamado. Ativado depois só com env vars na Vercel:
 *   AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET   (obrigatórias)
 *   + UM alvo: SHAREPOINT_SITE_ID  |  ONEDRIVE_DRIVE_ID  |  ONEDRIVE_USER (UPN)
 *   ONEDRIVE_PASTA_BASE (opcional, pasta raiz; padrão "Propostas Geradas — GTA")
 *
 * Sem dependências novas: fala com o Graph via fetch (igual ao envio de e-mail).
 */

const GRAPH = "https://graph.microsoft.com/v1.0";
const LOGIN = "https://login.microsoftonline.com";

function env() {
  return {
    tenant: process.env.AZURE_TENANT_ID?.trim() || "",
    clientId: process.env.AZURE_CLIENT_ID?.trim() || "",
    clientSecret: process.env.AZURE_CLIENT_SECRET?.trim() || "",
    driveId: process.env.ONEDRIVE_DRIVE_ID?.trim() || "",
    siteId: process.env.SHAREPOINT_SITE_ID?.trim() || "",
    user: process.env.ONEDRIVE_USER?.trim() || "",
  };
}

/** Pasta raiz onde as pastas de orçamento são criadas. */
export function pastaBase(): string {
  return process.env.ONEDRIVE_PASTA_BASE?.trim() || "Propostas Geradas — GTA";
}

/** true quando há credenciais + um alvo (drive/site/usuário) configurados. */
export function oneDriveConfigurado(): boolean {
  const e = env();
  return Boolean(e.tenant && e.clientId && e.clientSecret && (e.driveId || e.siteId || e.user));
}

// --------------------------------------------------------------- token (cache)
let tokenCache: { token: string; exp: number } | null = null;

async function getToken(): Promise<string> {
  const now = Date.now();
  if (tokenCache && tokenCache.exp > now + 60_000) return tokenCache.token;
  const { tenant, clientId, clientSecret } = env();
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "client_credentials",
    scope: "https://graph.microsoft.com/.default",
  });
  const res = await fetch(`${LOGIN}/${tenant}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) throw new Error(`Falha ao autenticar no Microsoft Graph (HTTP ${res.status}): ${(await res.text()).slice(0, 200)}`);
  const j = (await res.json()) as { access_token: string; expires_in?: number };
  tokenCache = { token: j.access_token, exp: now + (j.expires_in ?? 3600) * 1000 };
  return tokenCache.token;
}

async function graph(pathOrUrl: string, init: RequestInit, token: string): Promise<Response> {
  const url = pathOrUrl.startsWith("http") ? pathOrUrl : `${GRAPH}${pathOrUrl}`;
  return fetch(url, { ...init, headers: { Authorization: `Bearer ${token}`, ...(init.headers ?? {}) } });
}

// --------------------------------------------------------------- drive (cache)
let driveCache: string | null = null;

async function getDriveId(token: string): Promise<string> {
  if (driveCache) return driveCache;
  const { driveId, siteId, user } = env();
  if (driveId) return (driveCache = driveId);
  const alvo = siteId ? `/sites/${siteId}/drive` : user ? `/users/${encodeURIComponent(user)}/drive` : "";
  if (!alvo) throw new Error("OneDrive sem alvo configurado (SHAREPOINT_SITE_ID / ONEDRIVE_DRIVE_ID / ONEDRIVE_USER).");
  const r = await graph(alvo, {}, token);
  if (!r.ok) throw new Error(`Não foi possível resolver o drive do OneDrive (HTTP ${r.status}): ${(await r.text()).slice(0, 200)}`);
  const j = (await r.json()) as { id: string };
  return (driveCache = j.id);
}

/** Codifica um caminho de pasta preservando as barras. */
function encPath(caminho: string): string {
  return caminho.split("/").map(encodeURIComponent).join("/");
}

interface DriveItem { id: string; webUrl: string }

async function itemPorCaminho(driveId: string, caminho: string, token: string): Promise<DriveItem | null> {
  const r = await graph(`/drives/${driveId}/root:/${encPath(caminho)}`, {}, token);
  return r.ok ? ((await r.json()) as DriveItem) : null;
}

/** Garante que a pasta (aninhada) exista, criando cada segmento que faltar. */
async function garantirPasta(driveId: string, segmentos: string[], token: string): Promise<DriveItem> {
  let acc = "";
  let atual: DriveItem | null = null;
  for (const seg of segmentos) {
    const parentPath = acc;
    acc = acc ? `${acc}/${seg}` : seg;
    const existente = await itemPorCaminho(driveId, acc, token);
    if (existente) { atual = existente; continue; }
    const parentEndpoint = parentPath
      ? `/drives/${driveId}/root:/${encPath(parentPath)}:/children`
      : `/drives/${driveId}/root/children`;
    const c = await graph(parentEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: seg, folder: {}, "@microsoft.graph.conflictBehavior": "fail" }),
    }, token);
    if (c.ok) atual = (await c.json()) as DriveItem;
    else if (c.status === 409) atual = await itemPorCaminho(driveId, acc, token); // criada em concorrência
    else throw new Error(`Falha ao criar a pasta "${seg}" no OneDrive (HTTP ${c.status}): ${(await c.text()).slice(0, 150)}`);
    if (!atual) throw new Error(`Pasta "${seg}" não encontrada após criação.`);
  }
  if (!atual) throw new Error("Nenhum segmento de pasta informado.");
  return atual;
}

export interface ArquivoUpload {
  nome: string;
  bytes: Buffer | Uint8Array;
  contentType: string;
}
export interface ResultadoUpload {
  webUrl: string; // link web da pasta
  enviados: number;
  total: number;
  erros: string[];
}

/**
 * Cria/garante a pasta (caminho de segmentos) e envia os arquivos (upload simples;
 * cada arquivo aqui é ≤ 4 MB, o teto de anexo). Best-effort por arquivo: falha em
 * um não interrompe os demais.
 */
export async function enviarParaPasta(segmentos: string[], arquivos: ArquivoUpload[]): Promise<ResultadoUpload> {
  const token = await getToken();
  const driveId = await getDriveId(token);
  const pasta = await garantirPasta(driveId, segmentos, token);
  const caminho = segmentos.join("/");
  const erros: string[] = [];
  let enviados = 0;
  for (const a of arquivos) {
    try {
      const url = `/drives/${driveId}/root:/${encPath(`${caminho}/${a.nome}`)}:/content`;
      const r = await graph(url, { method: "PUT", headers: { "Content-Type": a.contentType }, body: a.bytes as BodyInit }, token);
      if (!r.ok) throw new Error(`HTTP ${r.status}: ${(await r.text()).slice(0, 120)}`);
      enviados++;
    } catch (e) {
      erros.push(`${a.nome}: ${e instanceof Error ? e.message : "erro"}`);
    }
  }
  return { webUrl: pasta.webUrl, enviados, total: arquivos.length, erros };
}

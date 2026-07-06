/**
 * Autenticação simples e fechada para uso interno.
 *
 * - Usuários autorizados vêm da env APP_USERS (JSON) ou de um padrão de desenvolvimento.
 * - A sessão é um cookie httpOnly assinado com HMAC-SHA256 (AUTH_SECRET).
 * - Funciona tanto no Node (rotas) quanto no Edge (middleware), pois usa Web Crypto.
 *
 * Estruturado para ser substituído por Supabase Auth no futuro sem tocar nas telas.
 */

export interface AppUser {
  email: string;
  password: string;
  name?: string;
}

export const SESSION_COOKIE = "gta_session";
const SESSION_TTL_SECONDS = 60 * 60 * 12; // 12h

const IS_PROD = process.env.NODE_ENV === "production";

function getSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (secret) return secret;
  if (IS_PROD) {
    // Em produção NUNCA usar segredo padrão (permitiria forjar sessões).
    throw new Error("AUTH_SECRET não configurado. Defina-o nas variáveis de ambiente.");
  }
  return "dev-secret-troque-em-producao";
}

/**
 * Usuários autorizados. Em desenvolvimento cai num usuário padrão para facilitar
 * testes; em produção, sem `APP_USERS` configurado, retorna lista vazia
 * (ninguém entra) — evita expor credenciais de teste na internet.
 */
export function getConfiguredUsers(): AppUser[] {
  const raw = process.env.APP_USERS;
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as AppUser[];
      if (Array.isArray(parsed) && parsed.length) return parsed;
    } catch {
      // ignora JSON inválido e cai no padrão (apenas em dev)
    }
  }
  if (IS_PROD) return [];
  return [{ email: "admin@gta.com", password: "gta123", name: "Administrador" }];
}

export function validateCredentials(email: string, password: string): AppUser | null {
  const users = getConfiguredUsers();
  const found = users.find(
    (u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password,
  );
  return found ?? null;
}

// ----- assinatura de cookie (HMAC-SHA256) ----------------------------------

function b64url(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecode(str: string): Uint8Array {
  const pad = str.length % 4 === 0 ? "" : "=".repeat(4 - (str.length % 4));
  const bin = atob(str.replace(/-/g, "+").replace(/_/g, "/") + pad);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function hmac(data: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(getSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  return new Uint8Array(sig);
}

export interface SessionPayload {
  email: string;
  name?: string;
  exp: number;
}

export async function signSession(user: AppUser): Promise<string> {
  const payload: SessionPayload = {
    email: user.email,
    name: user.name,
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
  };
  const body = b64url(new TextEncoder().encode(JSON.stringify(payload)));
  const sig = b64url(await hmac(body));
  return `${body}.${sig}`;
}

export async function verifySession(token: string | undefined): Promise<SessionPayload | null> {
  if (!token) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = b64url(await hmac(body));
  if (expected !== sig) return null;
  try {
    const payload = JSON.parse(new TextDecoder().decode(b64urlDecode(body))) as SessionPayload;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export { SESSION_TTL_SECONDS };

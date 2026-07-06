import { cookies } from "next/headers";
import { SESSION_COOKIE, verifySession, type SessionPayload } from "./auth";

/** Usuário logado a partir do cookie de sessão (rotas/páginas do servidor). */
export async function getSessionUser(): Promise<SessionPayload | null> {
  const store = await cookies();
  return verifySession(store.get(SESSION_COOKIE)?.value);
}

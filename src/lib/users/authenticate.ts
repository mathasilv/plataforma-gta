import { users } from "./store";
import { verifyPassword } from "./password";
import type { User } from "./types";

/**
 * Valida e-mail + senha contra o banco de usuários (senha com hash).
 * Módulo Node (usado pela rota de login), fora do `auth.ts` edge-safe.
 */
export async function validateCredentials(
  email: string,
  password: string,
): Promise<User | null> {
  const store = await users();
  const u = await store.getByEmail(email);
  if (!u || !u.active) return null;
  if (!verifyPassword(password, u.passwordHash)) return null;
  return u;
}

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { temPermissao } from "./resolve";
import type { PermissaoKey } from "./permissoes";
import type { User } from "@/lib/users/types";

/**
 * Guardas de autorização para route handlers (Node). Retornam `{ me }` em caso
 * de sucesso ou `{ error }` (NextResponse já pronto) para o handler devolver.
 */

type Guard = { me: User } | { error: NextResponse };

export async function requireApi(): Promise<Guard> {
  const me = await getCurrentUser();
  if (!me) return { error: NextResponse.json({ error: "Não autenticado." }, { status: 401 }) };
  return { me };
}

export async function requirePermissaoApi(chave: PermissaoKey): Promise<Guard> {
  const me = await getCurrentUser();
  if (!me) return { error: NextResponse.json({ error: "Não autenticado." }, { status: 401 }) };
  if (!(await temPermissao(me, chave))) {
    return { error: NextResponse.json({ error: "Sem permissão para esta ação." }, { status: 403 }) };
  }
  return { me };
}

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { users } from "@/lib/users/store";
import { changePasswordSchema } from "@/lib/users/types";
import { hashPassword, verifyPassword } from "@/lib/users/password";

export const runtime = "nodejs";

/**
 * Troca a senha do próprio usuário logado.
 * - Troca voluntária: exige a senha atual.
 * - Troca obrigatória (mustChangePassword): dispensa a senha atual (já entrou com ela).
 */
export async function POST(req: Request) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corpo inválido." }, { status: 400 });
  }

  const parsed = changePasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados inválidos.", issues: parsed.error.flatten() },
      { status: 422 },
    );
  }

  const { senhaAtual, novaSenha } = parsed.data;

  if (!me.mustChangePassword) {
    if (!senhaAtual || !verifyPassword(senhaAtual, me.passwordHash)) {
      return NextResponse.json({ error: "Senha atual incorreta." }, { status: 400 });
    }
  }

  const store = await users();
  await store.setPassword(me.id, hashPassword(novaSenha), false);
  return NextResponse.json({ ok: true });
}

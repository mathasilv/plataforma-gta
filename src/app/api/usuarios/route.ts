import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { users } from "@/lib/users/store";

export const runtime = "nodejs";

/** Lista usuários ATIVOS (email + nome) — usado no seletor de responsáveis. */
export async function GET() {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const store = await users();
  const usuarios = (await store.list())
    .filter((u) => u.active)
    .map((u) => ({ email: u.email, name: u.name }));
  return NextResponse.json({ usuarios });
}

import { NextResponse } from "next/server";
import { getConfiguredUsers } from "@/lib/auth";
import { getSessionUser } from "@/lib/session";

export const runtime = "nodejs";

/** Lista os usuários cadastrados na plataforma (sem expor senhas). */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const usuarios = getConfiguredUsers().map((u) => ({
    email: u.email,
    name: u.name ?? u.email,
  }));
  return NextResponse.json({ usuarios });
}

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";

export const runtime = "nodejs";

/** Dados públicos do usuário logado — usado por componentes client (ex.: avatar no cabeçalho). */
export async function GET() {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  return NextResponse.json({ name: me.name, email: me.email, role: me.role, avatarUrl: me.avatarUrl ?? "" });
}

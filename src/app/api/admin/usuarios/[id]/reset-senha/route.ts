import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { users } from "@/lib/users/store";
import { resetPasswordSchema } from "@/lib/users/types";
import { hashPassword, gerarSenhaProvisoria } from "@/lib/users/password";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

/** Admin reseta a senha de um usuário: gera provisória e força troca no próximo acesso. */
export async function POST(req: Request, ctx: Ctx) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  if (me.role !== "admin") return NextResponse.json({ error: "Acesso restrito a administradores." }, { status: 403 });

  const { id } = await ctx.params;

  let body: unknown = {};
  try {
    body = await req.json();
  } catch {
    // corpo vazio é aceito (gera senha automática)
  }
  const parsed = resetPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos.", issues: parsed.error.flatten() }, { status: 422 });
  }

  const store = await users();
  const alvo = await store.getById(id);
  if (!alvo) return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 });

  const senhaProvisoria = parsed.data.novaSenha?.trim() || gerarSenhaProvisoria();
  await store.setPassword(id, hashPassword(senhaProvisoria), true);
  return NextResponse.json({ ok: true, senhaProvisoria });
}

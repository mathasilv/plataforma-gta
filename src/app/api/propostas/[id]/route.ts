import { NextResponse } from "next/server";
import { getPropostaStore } from "@/lib/propostas/store";
import { updatePropostaSchema } from "@/lib/propostas/types";
import { getCurrentUser } from "@/lib/session";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  const { id } = await ctx.params;
  const proposta = await getPropostaStore().get(id);
  if (!proposta) return NextResponse.json({ error: "Proposta não encontrada." }, { status: 404 });
  return NextResponse.json({ proposta });
}

export async function PATCH(req: Request, ctx: Ctx) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  const { id } = await ctx.params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corpo inválido." }, { status: 400 });
  }
  const parsed = updatePropostaSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos.", issues: parsed.error.flatten() }, { status: 422 });
  }

  const proposta = await getPropostaStore().update(id, parsed.data);
  if (!proposta) return NextResponse.json({ error: "Proposta não encontrada." }, { status: 404 });
  return NextResponse.json({ proposta });
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  const { id } = await ctx.params;
  const ok = await getPropostaStore().remove(id);
  if (!ok) return NextResponse.json({ error: "Proposta não encontrada." }, { status: 404 });
  return NextResponse.json({ ok: true });
}

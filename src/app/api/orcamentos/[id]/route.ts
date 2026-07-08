import { NextResponse } from "next/server";
import { requireApi } from "@/lib/rbac/guards";
import { getOrcamentoStore } from "@/lib/orcamentos/store";
import { atualizarOrcamentoSchema } from "@/lib/orcamentos/types";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

/** Detalhe de um orçamento. */
export async function GET(_req: Request, ctx: Ctx) {
  const guard = await requireApi();
  if ("error" in guard) return guard.error;
  const { id } = await ctx.params;
  const orc = await getOrcamentoStore().get(id);
  if (!orc) return NextResponse.json({ error: "Orçamento não encontrado." }, { status: 404 });
  return NextResponse.json({ orcamento: orc });
}

/** Edita dados do orçamento — apenas o criador (ou admin) e somente em rascunho. */
export async function PATCH(req: Request, ctx: Ctx) {
  const guard = await requireApi();
  if ("error" in guard) return guard.error;
  const { id } = await ctx.params;

  const store = getOrcamentoStore();
  const orc = await store.get(id);
  if (!orc) return NextResponse.json({ error: "Orçamento não encontrado." }, { status: 404 });

  const me = guard.me;
  if (me.email !== orc.criadoPor && me.role !== "admin") {
    return NextResponse.json({ error: "Só o criador pode editar este orçamento." }, { status: 403 });
  }
  if (orc.estacao !== "rascunho") {
    return NextResponse.json({ error: "Só é possível editar em rascunho." }, { status: 409 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corpo inválido." }, { status: 400 });
  }
  const parsed = atualizarOrcamentoSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos.", issues: parsed.error.flatten() }, { status: 422 });
  }

  const atualizado = await store.update(id, parsed.data);
  return NextResponse.json({ orcamento: atualizado });
}

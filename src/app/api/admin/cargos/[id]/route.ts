import { NextResponse } from "next/server";
import { requirePermissaoApi } from "@/lib/rbac/guards";
import { cargos } from "@/lib/cargos/store";
import { atualizarCargoSchema } from "@/lib/cargos/types";
import { users } from "@/lib/users/store";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

/** Edita nome/permissões de um cargo. */
export async function PATCH(req: Request, ctx: Ctx) {
  const guard = await requirePermissaoApi("cargos.administrar");
  if ("error" in guard) return guard.error;
  const { id } = await ctx.params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corpo inválido." }, { status: 400 });
  }
  const parsed = atualizarCargoSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos.", issues: parsed.error.flatten() }, { status: 422 });
  }

  const store = await cargos();
  const atualizado = await store.update(id, parsed.data);
  if (!atualizado) return NextResponse.json({ error: "Cargo não encontrado." }, { status: 404 });
  return NextResponse.json({ cargo: atualizado });
}

/** Remove um cargo — bloqueia se houver usuários usando-o. */
export async function DELETE(_req: Request, ctx: Ctx) {
  const guard = await requirePermissaoApi("cargos.administrar");
  if ("error" in guard) return guard.error;
  const { id } = await ctx.params;

  const userStore = await users();
  const emUso = (await userStore.list()).filter((u) => u.cargoId === id);
  if (emUso.length > 0) {
    return NextResponse.json(
      { error: `Este cargo está atribuído a ${emUso.length} usuário(s). Remova a atribuição antes de excluir.` },
      { status: 409 },
    );
  }

  const store = await cargos();
  const ok = await store.remove(id);
  if (!ok) return NextResponse.json({ error: "Cargo não encontrado." }, { status: 404 });
  return NextResponse.json({ ok: true });
}

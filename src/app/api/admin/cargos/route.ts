import { NextResponse } from "next/server";
import { requirePermissaoApi } from "@/lib/rbac/guards";
import { cargos } from "@/lib/cargos/store";
import { criarCargoSchema } from "@/lib/cargos/types";

export const runtime = "nodejs";

/** Lista os cargos. */
export async function GET() {
  const guard = await requirePermissaoApi("cargos.administrar");
  if ("error" in guard) return guard.error;
  const store = await cargos();
  return NextResponse.json({ cargos: await store.list() });
}

/** Cria um cargo com um conjunto de permissões. */
export async function POST(req: Request) {
  const guard = await requirePermissaoApi("cargos.administrar");
  if ("error" in guard) return guard.error;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corpo inválido." }, { status: 400 });
  }
  const parsed = criarCargoSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos.", issues: parsed.error.flatten() }, { status: 422 });
  }

  const store = await cargos();
  const novo = await store.create({ nome: parsed.data.nome, permissoes: parsed.data.permissoes });
  return NextResponse.json({ cargo: novo }, { status: 201 });
}

import { NextResponse } from "next/server";
import { getClienteStore } from "@/lib/clientes/store";
import { criarClienteSchema } from "@/lib/clientes/types";
import { getCurrentUser } from "@/lib/session";
import { users } from "@/lib/users/store";

export const runtime = "nodejs";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  const clientes = await getClienteStore().list();

  // Resolve o nome do criador a partir do e-mail (apenas exibição).
  const nomePorEmail = new Map((await (await users()).list()).map((u) => [u.email.toLowerCase(), u.name]));
  const enriquecidos = clientes.map((c) => ({
    ...c,
    criadoPorNome: nomePorEmail.get((c.criadoPor ?? "").toLowerCase()) ?? c.criadoPor,
  }));

  return NextResponse.json({ clientes: enriquecidos });
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corpo inválido." }, { status: 400 });
  }
  const parsed = criarClienteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos.", issues: parsed.error.flatten() }, { status: 422 });
  }

  const cliente = await getClienteStore().create({
    ...parsed.data,
    criadoPor: user.email,
    criadoPorNome: user.name || user.email,
  });
  return NextResponse.json({ cliente }, { status: 201 });
}

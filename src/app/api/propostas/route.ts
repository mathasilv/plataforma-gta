import { NextResponse } from "next/server";
import { getPropostaStore } from "@/lib/propostas/store";
import { createPropostaSchema } from "@/lib/propostas/types";
import { getCurrentUser } from "@/lib/session";

export const runtime = "nodejs";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  const propostas = await getPropostaStore().list();
  return NextResponse.json({ propostas });
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
  const parsed = createPropostaSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos.", issues: parsed.error.flatten() }, { status: 422 });
  }

  const proposta = await getPropostaStore().create({ ...parsed.data, criadoPor: user.email });
  return NextResponse.json({ proposta }, { status: 201 });
}

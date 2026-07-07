import { NextResponse } from "next/server";
import { getPropostaStore } from "@/lib/propostas/store";
import { getCurrentUser } from "@/lib/session";

export const runtime = "nodejs";

/** Próximo nº sequencial de referência para o serviço (ano corrente). */
export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  const serviceKey = new URL(req.url).searchParams.get("serviceKey") ?? "";
  if (!serviceKey) return NextResponse.json({ error: "Serviço não informado." }, { status: 400 });
  const seq = await getPropostaStore().nextSeq(serviceKey);
  return NextResponse.json({ seq });
}

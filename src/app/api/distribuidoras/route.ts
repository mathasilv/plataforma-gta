import { NextResponse } from "next/server";
import { listarDistribuidoras } from "@/services/solar/tarifas";
import { getCurrentUser } from "@/lib/session";

export const runtime = "nodejs";

/** Lista de distribuidoras (siglas) para o cálculo de economia/Fio B. */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  return NextResponse.json(
    { distribuidoras: listarDistribuidoras() },
    { headers: { "Cache-Control": "private, max-age=3600" } },
  );
}

import { NextResponse } from "next/server";
import { listarMunicipios } from "@/services/solar/municipios";
import { getCurrentUser } from "@/lib/session";

export const runtime = "nodejs";

/** Lista de municípios (nome + UF) para o dropdown do configurador. */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  return NextResponse.json(
    { municipios: listarMunicipios() },
    { headers: { "Cache-Control": "private, max-age=3600" } },
  );
}

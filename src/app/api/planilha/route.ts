import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { construirPlanilha } from "@/services/planilha/builders";
import { planilhaBuffer } from "@/services/planilha/core";

export const runtime = "nodejs";

/** Gera a planilha .xlsx (com fórmulas) de um serviço a partir dos dados calculados. */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  let body: { serviceKey?: string; data?: Record<string, unknown>; nome?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corpo inválido." }, { status: 400 });
  }
  if (!body.serviceKey) return NextResponse.json({ error: "serviceKey ausente." }, { status: 422 });

  try {
    const wb = construirPlanilha(body.serviceKey, body.data ?? {});
    const buf = await planilhaBuffer(wb);
    const nome = (body.nome || `${body.serviceKey}-precificacao`).replace(/[^\w.-]+/g, "_");
    return new NextResponse(new Uint8Array(buf), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${nome}.xlsx"`,
      },
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Falha ao gerar a planilha." }, { status: 500 });
  }
}

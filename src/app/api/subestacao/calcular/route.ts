import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/session";
import { dimensionarSE, precoProjeto } from "@/services/subestacao/sizing";
import { getSubestacaoParams } from "@/services/subestacao/params";

export const runtime = "nodejs";

const schema = z.object({
  modo: z.enum(["carga", "demanda"]).default("carga"),
  cargaKw: z.coerce.number().min(0).default(0),
  fatorDemanda: z.coerce.number().min(0).max(1).default(0.6),
  fatorPotencia: z.coerce.number().min(0.5).max(1).default(0.92),
  demandaKva: z.coerce.number().min(0).default(0),
  tensaoMt: z.coerce.number().positive().default(13.8),
  tensaoBt: z.coerce.number().positive().default(380),
  tipoSE: z.enum(["Aérea", "Abrigada", "Pedestal"]).default("Aérea"),
  qtdSubestacoes: z.coerce.number().int().min(1).default(1),
});

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corpo inválido." }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos.", issues: parsed.error.flatten() }, { status: 422 });
  }
  const i = parsed.data;

  const sizing = dimensionarSE(i);
  const params = await getSubestacaoParams();
  const preco = precoProjeto(params, i.tipoSE, sizing.trafoKva, i.qtdSubestacoes);

  return NextResponse.json({ sizing, preco });
}

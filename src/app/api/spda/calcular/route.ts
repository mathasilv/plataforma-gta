import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/session";
import { precoSpda } from "@/services/spda/pricing";
import { getSpdaParams } from "@/services/spda/params";

export const runtime = "nodejs";

const schema = z.object({
  nBlocos: z.coerce.number().int().min(1).default(1),
  areaM2: z.coerce.number().min(0).default(0),
  custoLogistico: z.coerce.number().min(0).default(0),
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

  const params = await getSpdaParams();
  const preco = precoSpda(parsed.data, params);
  return NextResponse.json({ preco, params });
}

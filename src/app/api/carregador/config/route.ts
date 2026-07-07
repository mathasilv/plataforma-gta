import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { getSettingsStore } from "@/lib/settings/store";
import {
  getCarregadorParams,
  carregadorParamsSchema,
  CARREGADOR_PARAMS_DEFAULT,
  CARREGADOR_PARAMS_KEY,
} from "@/services/carregador/params";

export const runtime = "nodejs";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  return NextResponse.json({ params: await getCarregadorParams(), defaults: CARREGADOR_PARAMS_DEFAULT });
}

export async function PUT(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corpo inválido." }, { status: 400 });
  }
  const parsed = carregadorParamsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos.", issues: parsed.error.flatten() }, { status: 422 });
  }
  await getSettingsStore().set(CARREGADOR_PARAMS_KEY, parsed.data, user.email);
  return NextResponse.json({ params: parsed.data });
}

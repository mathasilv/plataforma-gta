import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { getSettingsStore } from "@/lib/settings/store";
import {
  getSolarParams,
  solarParamsSchema,
  SOLAR_PARAMS_DEFAULT,
  SOLAR_PARAMS_KEY,
} from "@/services/solar/params";

export const runtime = "nodejs";

/** Parâmetros vigentes do Solar (custos/eficiência). Leitura: qualquer usuário. */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  return NextResponse.json({ params: await getSolarParams(), defaults: SOLAR_PARAMS_DEFAULT });
}

/** Atualiza os parâmetros padrão — somente administradores. */
export async function PUT(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  if (user.role !== "admin") {
    return NextResponse.json({ error: "Apenas administradores podem alterar os parâmetros." }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corpo inválido." }, { status: 400 });
  }
  const parsed = solarParamsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos.", issues: parsed.error.flatten() }, { status: 422 });
  }

  await getSettingsStore().set(SOLAR_PARAMS_KEY, parsed.data, user.email);
  return NextResponse.json({ params: parsed.data });
}

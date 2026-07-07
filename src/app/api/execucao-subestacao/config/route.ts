import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { getSettingsStore } from "@/lib/settings/store";
import { getExecSeParams, execSeParamsSchema, EXECSE_PARAMS_DEFAULT, EXECSE_PARAMS_KEY } from "@/services/execucao-subestacao/params";

export const runtime = "nodejs";

/** Parâmetros de preço da Execução de Subestação. Leitura: qualquer usuário. */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  return NextResponse.json({ params: await getExecSeParams(), defaults: EXECSE_PARAMS_DEFAULT });
}

/** Atualiza os parâmetros — disponível para qualquer usuário autenticado. */
export async function PUT(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corpo inválido." }, { status: 400 });
  }
  const parsed = execSeParamsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos.", issues: parsed.error.flatten() }, { status: 422 });
  }

  await getSettingsStore().set(EXECSE_PARAMS_KEY, parsed.data, user.email);
  return NextResponse.json({ params: parsed.data });
}

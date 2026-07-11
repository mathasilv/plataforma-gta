import { NextResponse } from "next/server";
import { getNotificacaoStore } from "@/lib/notificacoes/store";
import { getCurrentUser } from "@/lib/session";

export const runtime = "nodejs";

/** Notificações do usuário atual + contagem de não-lidas (para o sino). */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  const notificacoes = await getNotificacaoStore().listPara(user.email);
  const naoLidas = notificacoes.filter((n) => !n.lida).length;
  return NextResponse.json({ notificacoes, naoLidas });
}

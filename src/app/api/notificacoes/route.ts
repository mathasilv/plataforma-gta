import { NextResponse, after } from "next/server";
import { getNotificacaoStore } from "@/lib/notificacoes/store";
import { processarNovidades } from "@/lib/notificacoes/novidades";
import { getCurrentUser } from "@/lib/session";

export const runtime = "nodejs";

/** Notificações do usuário atual + contagem de não-lidas (para o sino). */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  // O sino chama esta rota a cada 60s para todo usuário logado — aproveita
  // para checar (best-effort, idempotente) se há novidade pendente de aviso.
  after(() => processarNovidades());
  const notificacoes = await getNotificacaoStore().listPara(user.email);
  const naoLidas = notificacoes.filter((n) => !n.lida).length;
  return NextResponse.json({ notificacoes, naoLidas });
}

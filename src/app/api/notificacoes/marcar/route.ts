import { NextResponse } from "next/server";
import { getNotificacaoStore } from "@/lib/notificacoes/store";
import { getCurrentUser } from "@/lib/session";

export const runtime = "nodejs";

/**
 * Marca notificações como lidas. Corpo { id } marca uma; corpo vazio (ou
 * { todas: true }) marca todas as não-lidas do usuário. Devolve a nova
 * contagem de não-lidas.
 */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  let body: { id?: string; todas?: boolean } = {};
  try {
    body = await req.json();
  } catch {
    // corpo vazio → marcar todas
  }

  const store = getNotificacaoStore();
  if (body.id) await store.marcarLida(body.id, user.email);
  else await store.marcarTodasLidas(user.email);

  const naoLidas = (await store.listPara(user.email)).filter((n) => !n.lida).length;
  return NextResponse.json({ ok: true, naoLidas });
}

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { users } from "@/lib/users/store";
import { AVATAR_CONTENT_TYPES, AVATAR_MAX_BYTES } from "@/lib/users/types";
import { salvarAvatar, removerAvatar } from "@/lib/users/avatar-store";

export const runtime = "nodejs";

/** true = era uma URL do Blob (vale tentar apagar); data URL local não precisa. */
const eraBlob = (url: string) => Boolean(url) && !url.startsWith("data:");

/** Envia (ou troca) a foto de perfil do usuário logado. */
export async function POST(req: Request) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Envio inválido (esperado multipart/form-data)." }, { status: 400 });
  }
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Nenhuma imagem enviada." }, { status: 400 });
  }
  const contentType = file.type || "application/octet-stream";
  if (!AVATAR_CONTENT_TYPES.includes(contentType as (typeof AVATAR_CONTENT_TYPES)[number])) {
    return NextResponse.json({ error: "Envie uma imagem PNG, JPEG, WEBP ou GIF." }, { status: 415 });
  }
  if (file.size > AVATAR_MAX_BYTES) {
    return NextResponse.json({ error: `Imagem acima do limite de ${AVATAR_MAX_BYTES / (1024 * 1024)} MB.` }, { status: 413 });
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const { url } = await salvarAvatar(me.id, contentType, bytes);

  const store = await users();
  const antiga = me.avatarUrl ?? "";
  const atualizado = await store.update(me.id, { avatarUrl: url });
  if (!atualizado) return NextResponse.json({ error: "Falha ao salvar a foto." }, { status: 500 });

  // Remove a foto anterior do Blob depois de trocar (best-effort).
  if (eraBlob(antiga)) await removerAvatar(antiga, true);

  return NextResponse.json({ avatarUrl: atualizado.avatarUrl ?? "" });
}

/** Remove a foto de perfil (volta pro círculo com a inicial do nome). */
export async function DELETE() {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const antiga = me.avatarUrl ?? "";
  const store = await users();
  const atualizado = await store.update(me.id, { avatarUrl: "" });
  if (!atualizado) return NextResponse.json({ error: "Falha ao remover a foto." }, { status: 500 });

  if (eraBlob(antiga)) await removerAvatar(antiga, true);

  return NextResponse.json({ ok: true });
}

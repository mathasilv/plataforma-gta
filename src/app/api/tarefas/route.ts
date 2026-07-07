import { NextResponse, after } from "next/server";
import { getTaskStore } from "@/lib/tasks/store";
import { createTaskSchema } from "@/lib/tasks/types";
import { getSessionUser } from "@/lib/session";
import { notifyTaskAssigned } from "@/lib/email/notifyTask";

export const runtime = "nodejs";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const tasks = await getTaskStore().list();
  return NextResponse.json({ tasks });
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corpo inválido." }, { status: 400 });
  }

  const parsed = createTaskSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados inválidos.", issues: parsed.error.flatten() },
      { status: 422 },
    );
  }

  const task = await getTaskStore().create({ ...parsed.data, criadoPor: user.email });
  // Notifica o responsável por e-mail após a resposta (best-effort, não bloqueia).
  after(() => notifyTaskAssigned(task));
  return NextResponse.json({ task }, { status: 201 });
}

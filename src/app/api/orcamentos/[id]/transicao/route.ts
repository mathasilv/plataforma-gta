import { NextResponse } from "next/server";
import { requireApi } from "@/lib/rbac/guards";
import { temPermissao } from "@/lib/rbac/resolve";
import { getOrcamentoStore } from "@/lib/orcamentos/store";
import { transicaoSchema, type AcaoTransicao } from "@/lib/orcamentos/types";
import { permissaoDaAcao, podeTransicionar } from "@/lib/orcamentos/machine";
import { addDays } from "@/lib/format";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

const MENSAGEM_PADRAO: Record<AcaoTransicao, string> = {
  enviar: "Enviado para revisão",
  aprovar: "Aprovado",
  rejeitar: "Devolvido para ajustes",
  cancelar: "Orçamento cancelado",
};

/** Avança/decide um orçamento no fluxo de aprovação. */
export async function PATCH(req: Request, ctx: Ctx) {
  const guard = await requireApi();
  if ("error" in guard) return guard.error;
  const { id } = await ctx.params;
  const me = guard.me;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corpo inválido." }, { status: 400 });
  }
  const parsed = transicaoSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos.", issues: parsed.error.flatten() }, { status: 422 });
  }
  const { acao, parecer } = parsed.data;

  const store = getOrcamentoStore();
  const orc = await store.get(id);
  if (!orc) return NextResponse.json({ error: "Orçamento não encontrado." }, { status: 404 });

  // Autorização por permissão (o admin passa sempre como super-usuário).
  if (!(await temPermissao(me, permissaoDaAcao(acao)))) {
    return NextResponse.json({ error: "Você não tem permissão para esta ação." }, { status: 403 });
  }

  // Transição válida na máquina de estados.
  const t = podeTransicionar(orc.estacao, acao);
  if (!t.ok) return NextResponse.json({ error: t.erro }, { status: 409 });

  const autor = me.name || me.email;
  const decisaoHumana = acao !== "enviar";
  const agora = new Date();

  // Retenção do anexo (Fase 2): aprovado 7 dias, cancelado 3 dias.
  let expiraEm = orc.expiraEm ?? null;
  if (acao === "aprovar") expiraEm = addDays(agora, 7).toISOString();
  else if (acao === "cancelar") expiraEm = addDays(agora, 3).toISOString();

  await store.appendHistorico(id, {
    estacao: orc.estacao,
    tipo: acao,
    mensagem: parecer?.trim() || MENSAGEM_PADRAO[acao],
    autor,
  });

  const atualizado = await store.update(id, {
    estacao: t.destino,
    parecer: parecer?.trim() || undefined,
    decididoPor: decisaoHumana ? autor : undefined,
    decididoEm: decisaoHumana ? agora.toISOString() : undefined,
    expiraEm,
  });

  return NextResponse.json({ orcamento: atualizado });
}

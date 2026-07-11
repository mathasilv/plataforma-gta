import { NextResponse } from "next/server";
import { requireApi } from "@/lib/rbac/guards";
import { temPermissao } from "@/lib/rbac/resolve";
import { getOrcamentoStore, redigirOrcamento } from "@/lib/orcamentos/store";
import { transicaoSchema, type AcaoTransicao, type OrcamentoOneDrive } from "@/lib/orcamentos/types";
import { permissaoDaAcao, podeTransicionar } from "@/lib/orcamentos/machine";
import { oneDriveConfigurado, enviarOrcamentoParaOneDrive } from "@/lib/onedrive/orcamento";
import { notificar } from "@/lib/notificacoes/store";
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

  // Patch + registro de histórico numa única operação atômica (um UPDATE no
  // Postgres): falha no meio não deixa histórico e estação inconsistentes.
  const atualizado = await store.transicionar(
    id,
    {
      estacao: t.destino,
      parecer: parecer?.trim() || undefined,
      decididoPor: decisaoHumana ? autor : undefined,
      decididoEm: decisaoHumana ? agora.toISOString() : undefined,
      expiraEm,
    },
    {
      estacao: orc.estacao,
      tipo: acao,
      mensagem: parecer?.trim() || MENSAGEM_PADRAO[acao],
      autor,
    },
  );

  // Ao APROVAR, envia os arquivos (revisões + .docx) para o OneDrive. Best-effort:
  // se o OneDrive não estiver configurado, não faz nada; se falhar, a aprovação
  // segue válida e o erro fica registrado (o usuário pode reenviar pelo detalhe).
  let final = atualizado;
  if (acao === "aprovar" && atualizado && oneDriveConfigurado()) {
    let resultado: OrcamentoOneDrive;
    try {
      resultado = await enviarOrcamentoParaOneDrive(atualizado);
    } catch (e) {
      resultado = { pasta: "", url: "", arquivos: 0, enviadoEm: new Date().toISOString(), erro: e instanceof Error ? e.message : "Falha ao enviar ao OneDrive." };
    }
    final = (await store.update(id, { oneDrive: resultado })) ?? atualizado;
  }

  // Notifica o criador (in-app) quando o orçamento é aprovado ou devolvido —
  // exceto se ele mesmo tomou a decisão. Best-effort: nunca quebra a resposta.
  const decidiuOProprio = me.email.trim().toLowerCase() === orc.criadoPor.trim().toLowerCase();
  if (atualizado && !decidiuOProprio && (acao === "aprovar" || acao === "rejeitar")) {
    const aprovado = acao === "aprovar";
    await notificar({
      paraEmail: orc.criadoPor,
      tipo: aprovado ? "orcamento_aprovado" : "orcamento_rejeitado",
      titulo: aprovado
        ? `Orçamento ${orc.referencia} aprovado`
        : `Orçamento ${orc.referencia} devolvido para ajustes`,
      mensagem: parecer?.trim() || `${aprovado ? "Aprovado" : "Devolvido"} por ${autor}.`,
      link: `/aprovacoes/${id}`,
    });
  }

  return NextResponse.json({ orcamento: redigirOrcamento(final) });
}

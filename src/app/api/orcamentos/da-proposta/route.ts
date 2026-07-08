import { NextResponse } from "next/server";
import { requirePermissaoApi } from "@/lib/rbac/guards";
import { getOrcamentoStore, redigirOrcamento } from "@/lib/orcamentos/store";
import { criarDaPropostaSchema, type OrcamentoMeta } from "@/lib/orcamentos/types";
import { getPropostaStore } from "@/lib/propostas/store";
import { getService } from "@/services/registry";

export const runtime = "nodejs";

/** Cria (ou reabre) um orçamento na esteira a partir de uma proposta gerada. */
export async function POST(req: Request) {
  const guard = await requirePermissaoApi("orcamentos.criar");
  if ("error" in guard) return guard.error;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corpo inválido." }, { status: 400 });
  }
  const parsed = criarDaPropostaSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos.", issues: parsed.error.flatten() }, { status: 422 });
  }

  const proposta = await getPropostaStore().get(parsed.data.propostaId);
  if (!proposta) return NextResponse.json({ error: "Proposta não encontrada." }, { status: 404 });

  const store = getOrcamentoStore();

  // Evita duplicar: se já existe um orçamento para esta proposta, reabre-o.
  const existente = (await store.list()).find((o) => o.propostaId === proposta.id);
  if (existente) return NextResponse.json({ orcamento: redigirOrcamento(existente), reaberto: true });

  const service = getService(proposta.serviceKey);
  const src = (proposta.formGerado ?? proposta.dados) as Record<string, unknown>;

  // Forma de pagamento: em serviços com "Condições de pagamento" o texto final só
  // aparece nos dados mapeados do .docx (não em src.formaPagamento). Tenta o mapper.
  let formaPagamento = typeof src.formaPagamento === "string" ? src.formaPagamento : undefined;
  try {
    if (service && proposta.formGerado) {
      const parsed = service.zodSchema.safeParse(proposta.formGerado);
      if (parsed.success) {
        const fp = (service.map(parsed.data).data as Record<string, unknown>).formaPagamento;
        if (typeof fp === "string" && fp.trim()) formaPagamento = fp;
      }
    }
  } catch {
    // ignora — mantém o valor de src
  }

  const meta: OrcamentoMeta = {
    dataEmissao: typeof src.dataEmissao === "string" ? src.dataEmissao : undefined,
    validadeDias: typeof src.validadeDias === "number" ? src.validadeDias : undefined,
    formaPagamento,
  };
  const rotulo = service?.label ?? proposta.serviceKey;
  const descricao = proposta.referencia ? `${rotulo} — ${proposta.referencia}` : rotulo;

  const me = guard.me;
  const novo = await store.create({
    cliente: proposta.cliente || "—",
    fonte: "interno",
    estacao: "rascunho",
    serviceKey: proposta.serviceKey,
    propostaId: proposta.id,
    descricao,
    meta,
    expiraEm: null,
    criadoPor: me.email,
    criadoPorNome: me.name || me.email,
  });
  return NextResponse.json({ orcamento: redigirOrcamento(novo) }, { status: 201 });
}

import { NextResponse } from "next/server";
import { requirePermissaoApi } from "@/lib/rbac/guards";
import { getOrcamentoStore, redigirOrcamento } from "@/lib/orcamentos/store";
import { criarDaPropostaSchema, type OrcamentoMeta } from "@/lib/orcamentos/types";
import { getPropostaStore } from "@/lib/propostas/store";
import { getService } from "@/services/registry";
import { parseNumber } from "@/lib/format";

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

  // Regenerável = o MESMO `src` que o gerar-docx usa valida contra o schema do serviço.
  // Além disso, tenta o texto final da forma de pagamento via mapper (Condições de pagamento).
  let regeneravel = false;
  let formaPagamento = typeof src.formaPagamento === "string" ? src.formaPagamento : undefined;
  let valor: number | undefined;
  try {
    if (service) {
      const parsedSrc = service.zodSchema.safeParse(src);
      regeneravel = parsedSrc.success;
      if (parsedSrc.success) {
        const data = service.map(parsedSrc.data).data as Record<string, unknown>;
        const fp = data.formaPagamento;
        if (typeof fp === "string" && fp.trim()) formaPagamento = fp;
        // valorTotal vem formatado (ex.: "R$ 1.234,56"); parseNumber devolve o número.
        const vt = parseNumber(data.valorTotal);
        if (vt > 0) valor = vt;
      }
    }
  } catch {
    regeneravel = false;
  }

  const meta: OrcamentoMeta = {
    dataEmissao: typeof src.dataEmissao === "string" ? src.dataEmissao : undefined,
    validadeDias: typeof src.validadeDias === "number" ? src.validadeDias : undefined,
    formaPagamento,
    regeneravel,
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
    valor,
    expiraEm: null,
    criadoPor: me.email,
    criadoPorNome: me.name || me.email,
  });
  return NextResponse.json({ orcamento: redigirOrcamento(novo) }, { status: 201 });
}

import { NextResponse } from "next/server";
import { getOrcamentoStore } from "@/lib/orcamentos/store";
import { removerAnexo } from "@/lib/orcamentos/anexo-store";

export const runtime = "nodejs";

/**
 * Limpeza diária de anexos vencidos (retenção): aprovado +7d, cancelado +3d.
 * A Vercel Cron chama esta rota 1x/dia (ver vercel.json) enviando
 * `Authorization: Bearer <CRON_SECRET>`. `del()` no Blob é grátis; o registro
 * do orçamento permanece (histórico/rastro), só os bytes dos arquivos somem.
 */
function autorizado(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (secret) return req.headers.get("authorization") === `Bearer ${secret}`;
  // Sem CRON_SECRET: permitido só fora de produção (para testes locais).
  return process.env.NODE_ENV !== "production";
}

async function limpar(req: Request) {
  if (!autorizado(req)) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  const store = getOrcamentoStore();
  const agora = new Date().toISOString();
  const expirados = await store.listExpirados(agora);

  let anexosRemovidos = 0;
  let anexosFalhos = 0;
  for (const orc of expirados) {
    // Preserva as referências cuja remoção física NÃO foi confirmada, para que
    // o próximo cron tente de novo (evita órfão no Blob + registro limpo).
    const restantes: typeof orc.anexos = [];
    for (const anexo of orc.anexos) {
      if (await removerAnexo(anexo)) anexosRemovidos++;
      else {
        anexosFalhos++;
        restantes.push(anexo);
      }
    }
    await store.setAnexos(orc.id, restantes);
  }

  return NextResponse.json({ ok: true, orcamentos: expirados.length, anexosRemovidos, anexosFalhos });
}

export async function GET(req: Request) {
  return limpar(req);
}
export async function POST(req: Request) {
  return limpar(req);
}

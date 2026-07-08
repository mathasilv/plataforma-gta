import { NextResponse } from "next/server";
import { requireApi } from "@/lib/rbac/guards";
import { getOrcamentoStore } from "@/lib/orcamentos/store";
import { lerAnexo } from "@/lib/orcamentos/anexo-store";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string; anexoId: string }> };

/** Baixa um anexo — servido pela nossa rota (exige sessão). */
export async function GET(_req: Request, ctx: Ctx) {
  const guard = await requireApi();
  if ("error" in guard) return guard.error;
  const { id, anexoId } = await ctx.params;

  const orc = await getOrcamentoStore().get(id);
  if (!orc) return NextResponse.json({ error: "Orçamento não encontrado." }, { status: 404 });
  const anexo = orc.anexos.find((a) => a.id === anexoId);
  if (!anexo) return NextResponse.json({ error: "Anexo não encontrado." }, { status: 404 });

  try {
    const buffer = await lerAnexo(anexo);
    // Content-Disposition conforme RFC 5987: filename= ASCII (fallback) + filename* UTF-8.
    const ascii = anexo.nome.replace(/[^\x20-\x7e]/g, "_").replace(/["\\]/g, "_");
    const utf8 = encodeURIComponent(anexo.nome).replace(/['()*]/g, (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase());
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": anexo.contentType,
        "Content-Disposition": `attachment; filename="${ascii}"; filename*=UTF-8''${utf8}`,
        "Content-Length": String(buffer.length),
      },
    });
  } catch {
    return NextResponse.json({ error: "Anexo indisponível (pode ter expirado)." }, { status: 410 });
  }
}

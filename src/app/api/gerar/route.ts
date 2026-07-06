import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { getService } from "@/services/registry";
import { renderDocx } from "@/lib/docx/generate";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let body: { serviceKey?: string; formData?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corpo inválido." }, { status: 400 });
  }

  const service = getService(body.serviceKey ?? "");
  if (!service) {
    return NextResponse.json({ error: "Serviço não encontrado." }, { status: 404 });
  }

  // Validação com o schema do serviço
  const parsed = service.zodSchema.safeParse(body.formData);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados inválidos.", issues: parsed.error.flatten() },
      { status: 422 },
    );
  }

  try {
    const { data, patch } = service.map(parsed.data);

    const templatePath = path.join(process.cwd(), service.templateFile);
    const templateBuffer = fs.readFileSync(templatePath);

    const out = renderDocx(templateBuffer, data as Record<string, unknown>, patch);

    const ref = (data as Record<string, unknown>).referencia as string | undefined;
    const filename = `${ref ?? service.key}.docx`;

    return new NextResponse(out as BodyInit, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao gerar o documento.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

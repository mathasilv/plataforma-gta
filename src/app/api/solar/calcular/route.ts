import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/session";
import { getMunicipio } from "@/services/solar/municipios";
import { dimensionar, kwpTotal, overloadReal } from "@/services/solar/sizing";
import { simularGeracao } from "@/services/solar/generation";
import { gerarBom } from "@/services/solar/bom";
import { precificar, PRICING_DEFAULTS } from "@/services/solar/pricing";
import { parseNumber } from "@/lib/format";

export const runtime = "nodejs";

const schema = z.object({
  municipio: z.string(),
  consumo: z.array(z.coerce.number()).length(12),
  tipoConexao: z.enum(["mono", "bi", "tri"]).default("tri"),
  potenciaPainel: z.coerce.number().positive().default(700),
  eficiencia: z.coerce.number().positive().default(0.75),
  overloadDesejado: z.coerce.number().default(0.15),
  nPaineis: z.coerce.number().int().positive(),
  potenciaInversor: z.coerce.number().positive().default(1),
  qtdInversores: z.coerce.number().int().positive().default(1),
  tipoInversor: z.enum(["string", "micro"]).default("string"),
  tipoTelhado: z.string().default("Metálico"),
  // precificação (opcional)
  kit: z.union([z.string(), z.number()]).optional(),
  fator: z.coerce.number().optional(),
  execucaoCivil: z.union([z.string(), z.number()]).optional(),
});

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corpo inválido." }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos.", issues: parsed.error.flatten() }, { status: 422 });
  }
  const i = parsed.data;

  const mun = getMunicipio(i.municipio);
  if (!mun) return NextResponse.json({ error: "Município não encontrado." }, { status: 404 });

  const sizing = dimensionar({
    consumo: i.consumo,
    tipoConexao: i.tipoConexao,
    hsp: mun.hsp,
    potenciaPainel: i.potenciaPainel,
    eficiencia: i.eficiencia,
    overloadDesejado: i.overloadDesejado,
  });

  const kwp = kwpTotal(i.nPaineis, i.potenciaPainel);
  const overload = overloadReal(kwp, i.potenciaInversor);
  const geracao = simularGeracao(mun.hsp, kwp, i.eficiencia, i.consumo);
  const bom = gerarBom({
    nPaineis: i.nPaineis,
    potenciaPainel: i.potenciaPainel,
    tipoInversor: i.tipoInversor,
    potenciaInversor: i.potenciaInversor,
    qtdInversores: i.qtdInversores,
    tipoTelhado: i.tipoTelhado,
  });

  let pricing = null;
  const kitNum = parseNumber(i.kit ?? 0);
  if (kitNum > 0) {
    pricing = precificar({
      ...PRICING_DEFAULTS,
      fator: i.fator ?? PRICING_DEFAULTS.fator,
      execucaoCivil: parseNumber(i.execucaoCivil ?? 0),
      kit: kitNum,
      nPaineis: i.nPaineis,
      kwpTotal: kwp,
    });
  }

  return NextResponse.json({ sizing, kwpTotal: kwp, overload, geracao, bom, pricing });
}

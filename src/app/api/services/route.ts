import { NextResponse } from "next/server";
import { SERVICES } from "@/services/registry";
import { getCurrentUser } from "@/lib/session";

export const runtime = "nodejs";

/** Metadados públicos dos serviços — usados nos filtros e ações do histórico. */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  const services = SERVICES.map((s) => ({
    key: s.key,
    label: s.label,
    icon: s.icon,
    usesConfigurator: !!s.usesConfigurator,
  }));
  return NextResponse.json({ services });
}

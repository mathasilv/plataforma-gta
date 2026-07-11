import { NextResponse } from "next/server";
import { getClienteStore } from "@/lib/clientes/store";
import { CLIENTES_SERVICOS } from "@/lib/clientes/seed-servicos";
import { getCurrentUser } from "@/lib/session";

export const runtime = "nodejs";

/**
 * Importa a lista-semente de clientes da pasta "Serviços". Admin-only e
 * IDEMPOTENTE: quem já existe (mesmo nome, ignorando maiúsc./espaços) é pulado,
 * então rodar de novo não duplica. Devolve o que criou e o que ignorou.
 */
export async function POST() {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  if (me.role !== "admin") return NextResponse.json({ error: "Acesso restrito a administradores." }, { status: 403 });

  const store = getClienteStore();
  const existentes = new Set((await store.list()).map((c) => c.nome.trim().toLowerCase()));

  const criados: string[] = [];
  const ignorados: string[] = [];

  for (const seed of CLIENTES_SERVICOS) {
    const chave = seed.nome.trim().toLowerCase();
    if (existentes.has(chave)) {
      ignorados.push(seed.nome);
      continue;
    }
    await store.create({
      nome: seed.nome,
      tipoPessoa: seed.tipoPessoa ?? "PJ",
      documento: "",
      contatoNome: seed.contatoNome ?? "",
      telefone: "",
      email: "",
      cep: "",
      logradouro: "",
      numero: "",
      bairro: "",
      cidade: seed.cidade ?? "",
      uf: seed.uf ?? "",
      segmento: seed.segmento ?? "",
      observacoes: "Importado da pasta Serviços.",
      criadoPor: me.email,
      criadoPorNome: me.name || me.email,
    });
    existentes.add(chave); // evita duplicar se a semente tiver nomes repetidos
    criados.push(seed.nome);
  }

  return NextResponse.json({
    ok: true,
    total: CLIENTES_SERVICOS.length,
    criados: criados.length,
    ignorados: ignorados.length,
    nomesCriados: criados,
    nomesIgnorados: ignorados,
  });
}

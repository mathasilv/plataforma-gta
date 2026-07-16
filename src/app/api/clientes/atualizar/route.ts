import { NextResponse } from "next/server";
import { getClienteStore } from "@/lib/clientes/store";
import { CLIENTES_SERVICOS, type ClienteSeed } from "@/lib/clientes/seed-servicos";
import { getCurrentUser } from "@/lib/session";
import type { Cliente } from "@/lib/clientes/types";

export const runtime = "nodejs";

const CAMPOS_TEXTO = [
  "documento",
  "contatoNome",
  "telefone",
  "email",
  "cep",
  "logradouro",
  "numero",
  "bairro",
  "cidade",
  "uf",
  "segmento",
] as const satisfies readonly (keyof ClienteSeed & keyof Cliente)[];

/**
 * Monta o patch de atualização: só inclui um campo se (a) o seed trouxer um
 * valor e (b) o cliente já cadastrado tiver esse campo VAZIO. Nunca sobrescreve
 * o que já está preenchido (nome, segmento, contato etc. definidos manualmente
 * ou numa importação anterior ficam intactos). `observacoesExtra` é sempre
 * ANEXADO às observações existentes (é uma nota, não um fato a substituir).
 */
function montarPatch(existente: Cliente, seed: ClienteSeed): Partial<Cliente> {
  const patch: Partial<Cliente> = {};
  for (const campo of CAMPOS_TEXTO) {
    const valorNovo = seed[campo];
    if (valorNovo && !existente[campo]) {
      (patch as Record<string, unknown>)[campo] = valorNovo;
    }
  }
  // Anexa só se a nota ainda não estiver lá — sem isso, rodar a rota de novo
  // (idempotência) duplicaria a mesma observação a cada execução.
  if (seed.observacoesExtra && !existente.observacoes.includes(seed.observacoesExtra)) {
    patch.observacoes = existente.observacoes ? `${existente.observacoes} ${seed.observacoesExtra}` : seed.observacoesExtra;
  }
  return patch;
}

/**
 * Sincroniza o cadastro com a pasta Serviços: cria quem ainda não existe (com
 * os dados completos do seed) e PREENCHE só os campos vazios de quem já
 * existe — nunca sobrescreve o que já está preenchido. Idempotente: rodar de
 * novo não duplica nem perde dados já preenchidos manualmente.
 */
export async function POST() {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  if (me.role !== "admin") return NextResponse.json({ error: "Acesso restrito a administradores." }, { status: 403 });

  const store = getClienteStore();
  const existentes = await store.list();
  const porNome = new Map(existentes.map((c) => [c.nome.trim().toLowerCase(), c]));

  const criados: string[] = [];
  const atualizados: string[] = [];
  const semMudanca: string[] = [];

  for (const seed of CLIENTES_SERVICOS) {
    const chave = seed.nome.trim().toLowerCase();
    const existente = porNome.get(chave);

    if (!existente) {
      const novo = await store.create({
        nome: seed.nome,
        tipoPessoa: seed.tipoPessoa ?? "PJ",
        documento: seed.documento ?? "",
        contatoNome: seed.contatoNome ?? "",
        telefone: seed.telefone ?? "",
        email: seed.email ?? "",
        cep: seed.cep ?? "",
        logradouro: seed.logradouro ?? "",
        numero: seed.numero ?? "",
        bairro: seed.bairro ?? "",
        cidade: seed.cidade ?? "",
        uf: seed.uf ?? "",
        segmento: seed.segmento ?? "",
        observacoes: seed.observacoesExtra ?? "Importado da pasta Serviços.",
        criadoPor: me.email,
        criadoPorNome: me.name || me.email,
      });
      porNome.set(chave, novo);
      criados.push(seed.nome);
      continue;
    }

    const patch = montarPatch(existente, seed);
    if (Object.keys(patch).length > 0) {
      const atualizado = await store.update(existente.id, patch);
      if (atualizado) porNome.set(chave, atualizado);
      atualizados.push(seed.nome);
    } else {
      semMudanca.push(seed.nome);
    }
  }

  return NextResponse.json({
    ok: true,
    total: CLIENTES_SERVICOS.length,
    criados: criados.length,
    atualizados: atualizados.length,
    semMudanca: semMudanca.length,
    nomesCriados: criados,
    nomesAtualizados: atualizados,
  });
}

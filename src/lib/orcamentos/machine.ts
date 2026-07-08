import type { AcaoTransicao, Estacao } from "./types";
import type { PermissaoKey } from "@/lib/rbac/permissoes";

/**
 * Máquina de estados da esteira (pura, sem I/O). Define as transições válidas.
 * A autorização por PERMISSÃO é aplicada nas rotas (Node) via `permissaoDaAcao`.
 *
 * rascunho   --enviar--->   em_revisao
 * rascunho   --cancelar-->  cancelado
 * em_revisao --aprovar--->  aprovado    (gate humano final, exige parecer)
 * em_revisao --rejeitar-->  rascunho    (devolve ao criador, exige parecer)
 * em_revisao --cancelar-->  cancelado
 */

const TRANSICOES: Record<Estacao, Partial<Record<AcaoTransicao, Estacao>>> = {
  rascunho: { enviar: "em_revisao", cancelar: "cancelado" },
  em_revisao: { aprovar: "aprovado", rejeitar: "rascunho", cancelar: "cancelado" },
  aprovado: {},
  cancelado: {},
};

/** Permissão exigida para cada ação da esteira. */
export function permissaoDaAcao(acao: AcaoTransicao): PermissaoKey {
  switch (acao) {
    case "enviar":
      return "orcamentos.criar";
    case "aprovar":
    case "rejeitar":
      return "orcamentos.aprovar";
    case "cancelar":
      return "orcamentos.cancelar";
  }
}

export type Transicao =
  | { ok: true; destino: Estacao }
  | { ok: false; erro: string };

/** Verifica se a ação é válida a partir da estação atual. */
export function podeTransicionar(estacao: Estacao, acao: AcaoTransicao): Transicao {
  const destino = TRANSICOES[estacao]?.[acao];
  if (!destino) return { ok: false, erro: `Ação "${acao}" indisponível em "${estacao}".` };
  return { ok: true, destino };
}

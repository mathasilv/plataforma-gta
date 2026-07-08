import type { User } from "@/lib/users/types";
import { cargos } from "@/lib/cargos/store";
import { PERMISSAO_KEYS, type PermissaoKey } from "./permissoes";

/**
 * Resolução de permissões de um usuário (server-only — toca o banco de cargos).
 * NUNCA importar no middleware (que roda no Edge, sem banco).
 *
 * Regra: role "admin" é super-usuário (todas as permissões). Os demais herdam
 * as permissões do cargo atribuído (cargoId); sem cargo, nenhuma permissão.
 */

export async function permissoesDoUsuario(user: User): Promise<Set<PermissaoKey>> {
  if (user.role === "admin") return new Set(PERMISSAO_KEYS);
  if (!user.cargoId) return new Set();
  const store = await cargos();
  const cargo = await store.get(user.cargoId);
  return new Set(cargo?.permissoes ?? []);
}

export async function temPermissao(user: User, chave: PermissaoKey): Promise<boolean> {
  if (user.role === "admin") return true;
  const set = await permissoesDoUsuario(user);
  return set.has(chave);
}

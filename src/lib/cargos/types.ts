import { z } from "zod";
import { PERMISSAO_KEYS, type PermissaoKey } from "@/lib/rbac/permissoes";

/** Modelo e validação de Cargos (papéis customizáveis pelo admin). */

export interface Cargo {
  id: string;
  nome: string;
  permissoes: PermissaoKey[];
  /** Cargos de exemplo semeados na 1ª carga; podem ser editados/removidos. */
  builtin: boolean;
  criadoEm: string;
  atualizadoEm: string;
}

const permissaoEnum = z.enum(PERMISSAO_KEYS as [PermissaoKey, ...PermissaoKey[]]);
/** Remove duplicatas mantendo a ordem. */
const permissoesArray = z.array(permissaoEnum).transform((ps) => Array.from(new Set(ps)));

export const criarCargoSchema = z.object({
  nome: z.string().trim().min(1, "Informe o nome do cargo").max(60),
  permissoes: permissoesArray.default([]),
});

export const atualizarCargoSchema = z
  .object({
    nome: z.string().trim().min(1, "Informe o nome do cargo").max(60).optional(),
    permissoes: permissoesArray.optional(),
  })
  .refine((d) => d.nome !== undefined || d.permissoes !== undefined, {
    message: "Nada para atualizar.",
  });

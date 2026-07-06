import { z } from "zod";

/** Modelo e validação de Usuários. */

export type Role = "admin" | "member";

export interface User {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  role: Role;
  /** Se true, é obrigado a definir nova senha no próximo acesso. */
  mustChangePassword: boolean;
  active: boolean;
  criadoEm: string;
  atualizadoEm: string;
}

/** Usuário sem o hash de senha — seguro para enviar ao cliente. */
export type PublicUser = Omit<User, "passwordHash">;

export function toPublicUser(u: User): PublicUser {
  const { passwordHash: _omit, ...rest } = u;
  void _omit;
  return rest;
}

export const ROLE_LABEL: Record<Role, string> = {
  admin: "Administrador",
  member: "Membro",
};

const senha = z.string().min(8, "A senha deve ter ao menos 8 caracteres").max(128);

/** Admin cria um usuário (senha provisória pode ser gerada pelo servidor). */
export const createUserSchema = z.object({
  email: z.string().trim().toLowerCase().email("E-mail inválido"),
  name: z.string().trim().min(1, "Informe o nome").max(120),
  role: z.enum(["admin", "member"]).default("member"),
  senhaProvisoria: senha.optional(),
});

/** Admin edita nome/papel/ativação. */
export const updateUserSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  role: z.enum(["admin", "member"]).optional(),
  active: z.boolean().optional(),
});

/** Usuário troca a própria senha. `senhaAtual` é dispensada na troca obrigatória. */
export const changePasswordSchema = z.object({
  senhaAtual: z.string().optional(),
  novaSenha: senha,
});

/** Admin reseta a senha de alguém (senha pode ser gerada pelo servidor). */
export const resetPasswordSchema = z.object({
  novaSenha: senha.optional(),
});

import { z } from "zod";
import { getSettingsStore } from "@/lib/settings/store";

/**
 * Parâmetros de preço da Execução de Subestação (ver pricing.ts). Defaults das
 * planilhas reais (Rio Doce / Francefarma): Fator K 1,7, NF 6% → margem ≈ 35%.
 * Ajustáveis por qualquer usuário (settings key `execucao-subestacao:parametros`).
 */

export const EXECSE_PARAMS_KEY = "execucao-subestacao:parametros";

export const execSeParamsSchema = z.object({
  /** Fator K: markup sobre o custo (1,7 = padrão de execução) */
  fatorK: z.coerce.number().min(1).max(4),
  /** Alíquota de impostos/NF sobre o faturamento (0,06 = 6%) */
  aliqImpostos: z.coerce.number().min(0).max(0.5),
});

export type ExecSeParams = z.infer<typeof execSeParamsSchema>;

export const EXECSE_PARAMS_DEFAULT: ExecSeParams = {
  fatorK: 1.7,
  aliqImpostos: 0.06,
};

export async function getExecSeParams(): Promise<ExecSeParams> {
  const saved = await getSettingsStore().get<Partial<ExecSeParams>>(EXECSE_PARAMS_KEY);
  const parsed = execSeParamsSchema.safeParse({ ...EXECSE_PARAMS_DEFAULT, ...(saved ?? {}) });
  return parsed.success ? parsed.data : EXECSE_PARAMS_DEFAULT;
}

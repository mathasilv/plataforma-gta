import { z } from "zod";
import { getSettingsStore } from "@/lib/settings/store";

/**
 * Parâmetros de preço do QGBT (ver pricing.ts). Defaults da planilha real GEOLAB:
 * Fator K 1,55, NF 15% → margem ≈ 20%. Ajustáveis por qualquer usuário
 * (settings key `qgbt:parametros`).
 */

export const QGBT_PARAMS_KEY = "qgbt:parametros";

export const qgbtParamsSchema = z.object({
  /** Fator K: markup sobre o custo (1,55 = padrão QGBT) */
  fatorK: z.coerce.number().min(1).max(4),
  /** Alíquota de impostos/NF sobre o faturamento (0,15 = 15%) */
  aliqImpostos: z.coerce.number().min(0).max(0.5),
});

export type QgbtParams = z.infer<typeof qgbtParamsSchema>;

export const QGBT_PARAMS_DEFAULT: QgbtParams = {
  fatorK: 1.55,
  aliqImpostos: 0.15,
};

export async function getQgbtParams(): Promise<QgbtParams> {
  const saved = await getSettingsStore().get<Partial<QgbtParams>>(QGBT_PARAMS_KEY);
  const parsed = qgbtParamsSchema.safeParse({ ...QGBT_PARAMS_DEFAULT, ...(saved ?? {}) });
  return parsed.success ? parsed.data : QGBT_PARAMS_DEFAULT;
}

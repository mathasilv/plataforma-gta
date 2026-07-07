import { z } from "zod";
import { getSettingsStore } from "@/lib/settings/store";

/**
 * Parâmetros de preço do Carregador EV (planilha real da GTA):
 *   preço = (materiais × fatorK + mão de obra) / (1 − margem)
 * Ajustáveis por qualquer usuário (settings key `carregador:parametros`).
 */

export const CARREGADOR_PARAMS_KEY = "carregador:parametros";

export const carregadorParamsSchema = z.object({
  /** Mão de obra / despesas por ponto (R$) */
  maoObraPorPonto: z.coerce.number().min(0),
  /** Margem sobre o custo geral (fração: 0,45 = 45%) */
  margem: z.coerce.number().min(0).max(0.95),
  /** Fator K global (perdas/sobras) aplicado às quantidades de material */
  fatorK: z.coerce.number().min(1).max(2),
});

export type CarregadorParams = z.infer<typeof carregadorParamsSchema>;

/** Defaults da planilha (MO R$ 800, margem 45%, K 1,0). */
export const CARREGADOR_PARAMS_DEFAULT: CarregadorParams = {
  maoObraPorPonto: 800,
  margem: 0.45,
  fatorK: 1,
};

export async function getCarregadorParams(): Promise<CarregadorParams> {
  const saved = await getSettingsStore().get<Partial<CarregadorParams>>(CARREGADOR_PARAMS_KEY);
  const parsed = carregadorParamsSchema.safeParse({ ...CARREGADOR_PARAMS_DEFAULT, ...(saved ?? {}) });
  return parsed.success ? parsed.data : CARREGADOR_PARAMS_DEFAULT;
}

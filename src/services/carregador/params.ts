import { z } from "zod";
import { getSettingsStore } from "@/lib/settings/store";

/**
 * Parâmetros de preço do Carregador EV (planilha revisada da GTA):
 *   faturamento = (materiais + mão de obra) × Fator K
 *   margem líq. = (faturamento − impostos − custo) / faturamento
 * Ajustáveis por qualquer usuário (settings key `carregador:parametros`).
 */

// v2: modelo Fator K (markup) + impostos. A key foi versionada para ignorar
// valores salvos no modelo antigo (margem/quantidade), que tinham outro sentido.
export const CARREGADOR_PARAMS_KEY = "carregador:parametros:v2";

export const carregadorParamsSchema = z.object({
  /** Mão de obra / despesas por ponto (R$) */
  maoObraPorPonto: z.coerce.number().min(0),
  /** Fator K: markup sobre o custo geral (1,65 = padrão da planilha revisada) */
  fatorK: z.coerce.number().min(1).max(4),
  /** Alíquota de impostos sobre o faturamento (0,0701 = 5% + 2,01%) */
  aliqImpostos: z.coerce.number().min(0).max(0.5),
});

export type CarregadorParams = z.infer<typeof carregadorParamsSchema>;

/** Defaults da planilha revisada (MO R$ 800, Fator K 1,65, impostos 7,01% → margem líq. ≈ 30%). */
export const CARREGADOR_PARAMS_DEFAULT: CarregadorParams = {
  maoObraPorPonto: 800,
  fatorK: 1.65,
  aliqImpostos: 0.0701,
};

export async function getCarregadorParams(): Promise<CarregadorParams> {
  const saved = await getSettingsStore().get<Partial<CarregadorParams>>(CARREGADOR_PARAMS_KEY);
  const parsed = carregadorParamsSchema.safeParse({ ...CARREGADOR_PARAMS_DEFAULT, ...(saved ?? {}) });
  return parsed.success ? parsed.data : CARREGADOR_PARAMS_DEFAULT;
}

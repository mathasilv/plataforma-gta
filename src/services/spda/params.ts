import { z } from "zod";
import { getSettingsStore } from "@/lib/settings/store";

/**
 * Parâmetros de precificação do Projeto de SPDA (ver src/services/spda/pricing.ts).
 * Defaults extraídos da planilha real do CESSG (06/2026): R$ 1.650/bloco (risco),
 * R$ 3/m² (projeto), imposto/NF 15%. Piso mínimo derivado do padrão de jobs pequenos
 * (ex.: Roger R$ 2.500) + base de custo fixo. Ajustáveis por qualquer usuário
 * (settings key `spda:parametros`). Módulo só-servidor.
 */

export const SPDA_PARAMS_KEY = "spda:parametros";

export const spdaParamsSchema = z.object({
  /** R$ por bloco/estrutura (gerenciamento de risco) */
  valorPorBloco: z.coerce.number().min(0),
  /** R$ por m² (projeto de SPDA) */
  precoPorM2: z.coerce.number().min(0),
  /** Piso mínimo do design (risco + projeto) */
  pisoMinimo: z.coerce.number().min(0),
  /** Alíquota de impostos/NF sobre o faturamento (fração: 0,15 = 15%) */
  aliqImpostos: z.coerce.number().min(0).max(0.5),
});

export type SpdaParams = z.infer<typeof spdaParamsSchema>;

export const SPDA_PARAMS_DEFAULT: SpdaParams = {
  valorPorBloco: 1650,
  precoPorM2: 3,
  pisoMinimo: 2500,
  aliqImpostos: 0.15,
};

export async function getSpdaParams(): Promise<SpdaParams> {
  const saved = await getSettingsStore().get<Partial<SpdaParams>>(SPDA_PARAMS_KEY);
  const parsed = spdaParamsSchema.safeParse({ ...SPDA_PARAMS_DEFAULT, ...(saved ?? {}) });
  return parsed.success ? parsed.data : SPDA_PARAMS_DEFAULT;
}

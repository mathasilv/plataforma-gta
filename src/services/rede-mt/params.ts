import { z } from "zod";
import { getSettingsStore } from "@/lib/settings/store";

/**
 * Parâmetros de preço da Rede MT/BT (ver pricing.ts).
 * - Projeto: Fator K 1,889 / NF 15% → margem 40% (K calibrado p/ mirar 40%
 *   líquidos com a NF por dentro; decisão de gestão 07/2026).
 * - Execução: Fator K 1,7 / NF 6% → margem ~35% (planilhas Rio Doce/Francefarma).
 * Ajustáveis por qualquer usuário (settings key `rede-mt:parametros`).
 */

export const REDEMT_PARAMS_KEY = "rede-mt:parametros";

export const redeMtParamsSchema = z.object({
  /** Projeto: markup sobre o custo (NF por dentro) */
  fatorKProjeto: z.coerce.number().min(1).max(5),
  /** Projeto: alíquota de NF "por dentro" (fração) */
  nfProjeto: z.coerce.number().min(0).max(0.5),
  /** Execução: markup sobre o custo */
  fatorKExecucao: z.coerce.number().min(1).max(4),
  /** Execução: alíquota de NF sobre o faturamento (fração) */
  nfExecucao: z.coerce.number().min(0).max(0.5),
});

export type RedeMtParams = z.infer<typeof redeMtParamsSchema>;

export const REDEMT_PARAMS_DEFAULT: RedeMtParams = {
  fatorKProjeto: 1.889, // → margem 40% com NF 15% "por dentro"
  nfProjeto: 0.15,
  fatorKExecucao: 1.7,
  nfExecucao: 0.06,
};

export async function getRedeMtParams(): Promise<RedeMtParams> {
  const saved = await getSettingsStore().get<Partial<RedeMtParams>>(REDEMT_PARAMS_KEY);
  const parsed = redeMtParamsSchema.safeParse({ ...REDEMT_PARAMS_DEFAULT, ...(saved ?? {}) });
  return parsed.success ? parsed.data : REDEMT_PARAMS_DEFAULT;
}

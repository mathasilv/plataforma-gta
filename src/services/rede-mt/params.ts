import { z } from "zod";
import { getSettingsStore } from "@/lib/settings/store";

/**
 * Parâmetros de preço da Rede MT/BT (ver pricing.ts). Defaults das planilhas
 * reais (Rio Doce): projeto Fator K 2,125 / NF 15%; execução Fator K 1,7 / NF 6%.
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
  fatorKProjeto: 2.125,
  nfProjeto: 0.15,
  fatorKExecucao: 1.7,
  nfExecucao: 0.06,
};

export async function getRedeMtParams(): Promise<RedeMtParams> {
  const saved = await getSettingsStore().get<Partial<RedeMtParams>>(REDEMT_PARAMS_KEY);
  const parsed = redeMtParamsSchema.safeParse({ ...REDEMT_PARAMS_DEFAULT, ...(saved ?? {}) });
  return parsed.success ? parsed.data : REDEMT_PARAMS_DEFAULT;
}

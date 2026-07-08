import { z } from "zod";
import { getSettingsStore } from "@/lib/settings/store";

/**
 * Parâmetros de preço do Projeto Elétrico BT: taxa R$/m² e piso por disciplina,
 * mais o multiplicador industrial. Defaults ancorados no CPMG (677 m² →
 * ~R$ 18/m² do predial elétrico, repartido por disciplina). Ajustáveis por
 * qualquer usuário (settings key `projeto-bt:parametros`). Módulo só-servidor.
 */

export const PROJETOBT_PARAMS_KEY = "projeto-bt:parametros";

export const projetoBtParamsSchema = z.object({
  taxaForca: z.coerce.number().min(0).max(1000),
  pisoForca: z.coerce.number().min(0),
  taxaIluminacao: z.coerce.number().min(0).max(1000),
  pisoIluminacao: z.coerce.number().min(0),
  taxaTelecom: z.coerce.number().min(0).max(1000),
  pisoTelecom: z.coerce.number().min(0),
  taxaRetrofit: z.coerce.number().min(0).max(1000),
  pisoRetrofit: z.coerce.number().min(0),
  /** Multiplicador aplicado às disciplinas em edificação industrial. */
  multIndustrial: z.coerce.number().min(1).max(3),
});

export type ProjetoBtParams = z.infer<typeof projetoBtParamsSchema>;

export const PROJETOBT_PARAMS_DEFAULT: ProjetoBtParams = {
  taxaForca: 11, pisoForca: 2500,
  taxaIluminacao: 7, pisoIluminacao: 2000,
  taxaTelecom: 5, pisoTelecom: 2000,
  taxaRetrofit: 10, pisoRetrofit: 2500,
  multIndustrial: 1.4,
};

export async function getProjetoBtParams(): Promise<ProjetoBtParams> {
  const saved = await getSettingsStore().get<Partial<ProjetoBtParams>>(PROJETOBT_PARAMS_KEY);
  const parsed = projetoBtParamsSchema.safeParse({ ...PROJETOBT_PARAMS_DEFAULT, ...(saved ?? {}) });
  return parsed.success ? parsed.data : PROJETOBT_PARAMS_DEFAULT;
}

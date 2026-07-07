import { z } from "zod";
import { getSettingsStore } from "@/lib/settings/store";

/**
 * Parâmetros de precificação do Projeto de Subestação (modelo por custo).
 *   preço = (horas × valor/hora + ART) × (1 + margem)
 * Horas = base por tipo (aérea/abrigada/pedestal) + incremento por 100 kVA.
 * Defaults calibrados pelos orçamentos reais da GTA; ajustáveis na tela por
 * qualquer usuário (settings key `subestacao:parametros`). Módulo só-servidor.
 */

export const SUBESTACAO_PARAMS_KEY = "subestacao:parametros";

export const subestacaoParamsSchema = z.object({
  /** Valor da hora de engenharia (R$/h) */
  valorHora: z.coerce.number().min(0),
  /** Horas-base de projeto — subestação aérea */
  horasAerea: z.coerce.number().min(0),
  /** Horas-base de projeto — subestação abrigada/cubículo */
  horasAbrigada: z.coerce.number().min(0),
  /** Horas-base de projeto — subestação pedestal */
  horasPedestal: z.coerce.number().min(0),
  /** Horas adicionais a cada 100 kVA (complexidade) */
  horasPorCemKva: z.coerce.number().min(0),
  /** ART/TRT e taxas fixas (R$) */
  artProjeto: z.coerce.number().min(0),
  /** Margem sobre o custo (fração: 0,5 = 50%) */
  margemProjeto: z.coerce.number().min(0).max(5),
});

export type SubestacaoParams = z.infer<typeof subestacaoParamsSchema>;

/** Defaults calibrados: aérea pequena ≈ R$ 6.000; abrigada 750 kVA ≈ R$ 15.250. */
export const SUBESTACAO_PARAMS_DEFAULT: SubestacaoParams = {
  valorHora: 150,
  horasAerea: 20,
  horasAbrigada: 50,
  horasPedestal: 34,
  horasPorCemKva: 2,
  artProjeto: 500,
  margemProjeto: 0.5,
};

export async function getSubestacaoParams(): Promise<SubestacaoParams> {
  const saved = await getSettingsStore().get<Partial<SubestacaoParams>>(SUBESTACAO_PARAMS_KEY);
  const parsed = subestacaoParamsSchema.safeParse({ ...SUBESTACAO_PARAMS_DEFAULT, ...(saved ?? {}) });
  return parsed.success ? parsed.data : SUBESTACAO_PARAMS_DEFAULT;
}

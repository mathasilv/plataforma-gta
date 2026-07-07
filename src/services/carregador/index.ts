import type { ServiceModule } from "../types";
import { carregadorZodSchema, type CarregadorFormData } from "./config";
import { mapCarregador } from "./mapper";

/**
 * Carregador Veicular (EV) — serviço com configurador próprio (dimensionamento
 * NBR 5410 + lista de materiais + preço pelo Fator K). A geração do .docx usa
 * molde e mapper próprios, padronizados no mesmo desenho da proposta Solar.
 */
export const carregadorService: ServiceModule = {
  key: "carregador",
  label: "Carregador Veicular (EV)",
  description: "Dimensiona a infraestrutura (NBR 5410), monta a lista de materiais e precifica.",
  referencePrefix: "EV",
  validityDays: 20,
  usesConfigurator: true,
  templateFile: "src/services/carregador/template.docx",
  formSchema: { sections: [] },
  zodSchema: carregadorZodSchema,
  map: (formData) => mapCarregador(formData as CarregadorFormData),
};

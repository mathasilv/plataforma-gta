import type { ServiceModule } from "../types";
import { solarFormSchema, solarZodSchema } from "./config";
import { mapSolar } from "./mapper";
import type { SolarFormData } from "./config";

/**
 * Serviço: Energia Solar Fotovoltaica On-Grid.
 * Cumpre o contrato ServiceModule — o núcleo (formulário + geração) usa isto.
 */
export const solarService: ServiceModule = {
  key: "solar",
  label: "Energia Solar Fotovoltaica",
  description:
    "Proposta de sistema de microgeração solar On-Grid (implantação ou ampliação).",
  icon: "☀️",
  referencePrefix: "SOLAR",
  validityDays: 20,
  templateFile: "src/services/solar/template.docx",
  formSchema: solarFormSchema,
  zodSchema: solarZodSchema,
  map: (formData) => mapSolar(formData as SolarFormData),
};

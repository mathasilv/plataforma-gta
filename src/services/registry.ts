import type { ServiceModule } from "./types";
import { solarService } from "./solar";
import { limpezaService } from "./limpeza";
import { inspecaoSeService } from "./inspecao-se";
import { spdaService } from "./spda";
import { carregadorEvService } from "./carregador-ev";
import { qgbtService } from "./qgbt";
import { projetoSeService } from "./projeto-se";
import { projetoRedeMtService } from "./projeto-rede-mt";
import { execucaoRedeMtService } from "./execucao-rede-mt";
import { execucaoSeService } from "./execucao-se";
import { loteamentoMtbtService } from "./loteamento-mtbt";

/**
 * Registro central de serviços da plataforma.
 *
 * Para adicionar um serviço novo: crie a pasta (config + template.docx + mapper),
 * importe o módulo e adicione-o a este array. O dashboard, o formulário dinâmico
 * e o endpoint de geração passam a reconhecê-lo automaticamente.
 */
export const SERVICES: ServiceModule[] = [
  solarService,
  limpezaService,
  inspecaoSeService,
  spdaService,
  carregadorEvService,
  qgbtService,
  projetoSeService,
  projetoRedeMtService,
  execucaoRedeMtService,
  execucaoSeService,
  loteamentoMtbtService,
];

export function getService(key: string): ServiceModule | undefined {
  return SERVICES.find((s) => s.key === key);
}

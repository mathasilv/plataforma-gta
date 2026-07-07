import type { ServiceModule } from "./types";
import { solarService } from "./solar";
import { subestacaoService } from "./subestacao";
import { carregadorService } from "./carregador";
import { spdaService } from "./spda";
import { execucaoSubestacaoService } from "./execucao-subestacao";
import { redeMtService } from "./rede-mt";
import { qgbtService } from "./qgbt";
import { conexaoConcessionariaService } from "./conexao-concessionaria";
import { analisadorEnergiaService } from "./analisador-energia";
import {
  laudoInspecaoService,
  projetoEletricoBtService,
  limpezaPlacasService,
} from "./_cpq/catalog";

/**
 * Registro central de serviços da plataforma.
 *
 * - Solar: configurador próprio (dimensionamento + economia).
 * - Demais: serviços CPQ de engenharia elétrica, com precificação base derivada
 *   das propostas reais da GTA (ver src/services/_cpq). Conexão e Analisador têm
 *   regras fixas de gestão.
 *
 * O dashboard, o formulário e o endpoint de geração reconhecem automaticamente
 * qualquer serviço deste array.
 */
export const SERVICES: ServiceModule[] = [
  solarService,
  subestacaoService,
  execucaoSubestacaoService,
  conexaoConcessionariaService,
  redeMtService,
  spdaService,
  laudoInspecaoService,
  analisadorEnergiaService,
  carregadorService,
  qgbtService,
  projetoEletricoBtService,
  limpezaPlacasService,
];

export function getService(key: string): ServiceModule | undefined {
  return SERVICES.find((s) => s.key === key);
}

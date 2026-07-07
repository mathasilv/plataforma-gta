/**
 * Importa a tabela do "Acompanhamento Semanal" para o módulo de Tarefas.
 *
 *   node scripts/import-tarefas.mjs            # grava em data/tasks.json (dev)
 *   node scripts/import-tarefas.mjs --reset    # limpa antes de importar
 *   POSTGRES_URL="..." node scripts/import-tarefas.mjs   # grava no banco (produção)
 *
 * Regras (conforme solicitado):
 *  - Coluna "Observações": o trecho ANTES do primeiro separador vira a DESCRIÇÃO;
 *    os demais trechos viram COMENTÁRIOS (autor = responsável da tarefa).
 *  - Separadores reconhecidos: " | ", " - ", " / " (com espaços dos dois lados),
 *    então datas como 09/06/26 e "km/ mês" não são quebradas.
 *  - "Prazo de Término" vira o prazo; status mapeado para os do sistema.
 *  - Idempotente por (título + cliente).
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const RESET = process.argv.includes("--reset");

// ---- dados extraídos do PDF (Acompanhamento Semanal - 27.04) ----------------
// [titulo, cliente, responsavel, prazoTermino(dd/mm/aaaa ou ""), status, observacoes]
const LINHAS = [
  ["Alinhar Encontro de Contas com Energius", "CPDF", "Gabriel", "22/05/2026", "Em andamento", "Alinhar com Diretoria forma de pagamento | Falta fazer o pagamento"],
  ["Orçamento Bess", "CPDF", "Gabriel", "10/07/2026", "Em Atraso", ""],
  ["Fazer Rateio de Energia de Junho", "CPDF", "Marcela", "06/07/2026", "Em andamento", "Gabriel deverá enviar para a Karla"],
  ["Elaborar Orçamento de Smart Meter com a WEG para o Rateio", "CPDF", "Gabriel", "09/07/2026", "Em Atraso", ""],
  ["Alinhamento das informações preliminares com Junior", "Sobreiro", "Gabriel", "07/07/2026", "Em Atraso", "Entender arquivos a mais que o cliente enviou no grupo e entender a potência para solicitar carga | PV verificar qual rede alimenta o cliente."],
  ["Alinhamento da cadeia de comissão", "Sobreiro", "Gabriel", "09/07/2026", "Em Atraso", ""],
  ["Orçamento de retrofit do Auditorio", "CPDF", "Gabriel", "10/07/2026", "Em andamento", "Alessandro irá fazer a visita técnica dia 06/07 e retornar com as informações para orçamento"],
  ["Elaborar projeto de Múltiplas Unidades Consumidoras", "SE Goianápolis", "Marcela", "", "A iniciar", "Dependerá de análise da Equatorial - Orçamento de conexão enviado em 09/06/26 / Alterações respondidas em 11/06/26"],
  ["Solicitar vistoria e ligação", "SE Goianápolis", "Marcela", "", "A iniciar", "Aguardar execução"],
  ["Solicitar Orçamento de Conexão", "CMPG Itapuranga", "Marcela", "16/06/2026", "Em andamento", "Orçamento de conexão enviado em 19/06/26"],
  ["Solicitar Orçamento de Conexão", "Fazenda Rio Doce", "Marcela", "26/06/2026", "Em andamento", "Orçamento de conexão enviado em 29/06/26"],
  ["Solicitar Orçamento de Conexão", "Sobreiro", "Marcela", "03/07/2026", "Em Atraso", "Aguardando Procuração, valor da potência e rede que irá alimentar"],
  ["Validação de funcionalidade da planilha de automação de Orçamentos", "GTA", "Matheus", "07/07/2026", "Em andamento", ""],
  ["Finalizar a automação 100% da automação de orçametnos já com o gerador de propostas", "GTA", "Matheus", "10/07/2026", "A iniciar", ""],
  ["Elaborar Orçamento para Usina Solar Residencial Veneza", "", "Matheus", "30/06/2026", "Em Atraso", "Aguardando revisão do Matheus para envio | Falta envio para o Comercial (Tito)"],
  ["EMERGENCIAL - Orçamento (Troca do refletor na higiniezação, troca de 20 lampadas de led 50W no galpão)", "Localiza", "Gabriel", "10/07/2026", "Em andamento", "Foi realizado troca de 8 lampadas, pendente 10 lampadas a serem substituidas no dia que a Localiza autorizar. Emitir orçamento emergencial para pagamento de refletor de higienização e 18 lampadas | Gabriel irá alimentar pasta com as informações encessárias | Orçamento está concluído. Aguardando iniciar o mês de Julho para Enviar a parte 2 do orçamento | Gabriel Enviou orçamento parte 2 para aprovação da Localiza. Monitorando aprovação"],
  ["Analisar aumento de Usina Luciano e Orçar este aumento / Orçar separadamente a instalação do carregador (Usar com referência Eduardo)", "Luciano", "Matheus", "02/07/2026", "Em andamento", "Considerar Consumo de BYD Dolphin como 1500 km/ mês | Orçamento solar feito e enviado. Pendente o orçamento do carregador"],
  ["Cobrar Pedro a execução e aprovação do projeto", "Marcelo Bernadeli", "Paulo Vitor", "10/07/2026", "Em andamento", "Aguardando retorno da Equatorial sobre aprovação - Enviado em 22/06/26"],
  ["Implementar o Projeto 2027 no CPDF (Evento dos Bispos do Brasil)", "CPDF", "Tito", "12/06/2026", "Em Atraso", "Propor para Lorraine"],
  ["Tratar Desligamento da Subestação CPDF", "CPDF", "Tito", "30/04/2026", "Em Atraso", "Aguardando Ricardo Lemes informar data disponível | Aguardando retorno da Karla se será dia 25/5 ou 01/06 | Será solicitada nova data para desligamento."],
  ["Mandar Analisador para Calibração", "GTA Energia", "Tito", "12/06/2026", "Em Atraso", "Será avaliado se será instalado primeiro na pizzaria castelinho"],
  ["Elaborar o Relatório do cartório de Niteroi", "Cartórios", "Tito", "04/06/2026", "Em andamento", "Gabriel e Paulo Vitor devem dar opinião sobre o relatorio proposto pelo Tito | Aguardando Emissão de Nota Fiscal e Pagamento"],
  ["Apresentar Orçamento de Divisão de Circuitos", "CPDF", "Tito", "23/06/2026", "Em Atraso", "Orçamento e Apresentação estão prontos. Tito irá agendar e apresentar"],
  ["Enviar relatório de economia para o Cliente", "Souza Agronegócio", "Tito", "01/07/2026", "Em Atraso", ""],
  ["Gerar Criativos do instagram", "GTA Energia", "Marcela", "08/07/2026", "Em andamento", "Alinhamento com Comercial de estratégia de marketing"],
  ["Orçamento Solar Marcos 350kWh / mês", "Marcos", "Marcela", "08/07/2026", "A iniciar", "Telhado fibrocimento / Consumo de 350kWh / Estrutura de : Madeira"],
  ["Cadastrar GTA nos bancos ( Santander, Sol Agora e Meu Financiamento Solar)", "GTA Energia", "Marcela", "09/07/2026", "A iniciar", ""],
  ["Elaborar Medição Consultoria CPDF (Junho/Julho 2026)", "CPDF", "Paulo Vitor", "09/07/2026", "A iniciar", ""],
];

const STATUS_MAP = { "A iniciar": "afazer", "Em andamento": "andamento", "Em Atraso": "andamento" };

function toISODate(br) {
  if (!br || br === "-") return "";
  const [d, m, y] = br.split("/");
  return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
}

// separadores: " | ", " - ", " / ", " – ", " — " (com espaço dos dois lados)
function splitObs(obs) {
  return (obs || "")
    .split(/\s+[|/–—-]\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

const now = new Date();
function buildTask([titulo, cliente, responsavel, termino, statusBr, obs]) {
  const partes = splitObs(obs);
  const descricao = partes.length ? partes[0] : "";
  const comentarios = partes.slice(1).map((texto, i) => ({
    id: crypto.randomUUID(),
    autor: responsavel,
    texto,
    em: new Date(now.getTime() + i * 1000).toISOString(),
  }));
  const criadoEm = now.toISOString();
  return {
    id: crypto.randomUUID(),
    titulo,
    descricao,
    cliente,
    responsavel,
    status: STATUS_MAP[statusBr] ?? "afazer",
    prioridade: "media",
    prazo: toISODate(termino),
    comentarios,
    criadoPor: "importacao",
    criadoEm,
    atualizadoEm: criadoEm,
  };
}

const novas = LINHAS.map(buildTask);

// ---- destino: Postgres (se houver URL) ou arquivo JSON local ----------------
function getDbUrl() {
  const raw = process.env.POSTGRES_URL || process.env.DATABASE_URL || "";
  return raw.replace(/([?&])channel_binding=[^&]*/gi, "$1").replace(/\?&/, "?").replace(/[?&]$/, "");
}

async function importarPostgres(url) {
  const { createRequire } = await import("node:module");
  const require = createRequire(import.meta.url);
  const { createPool } = require("@vercel/postgres");
  const pool = createPool({ connectionString: url });
  await pool.sql`CREATE TABLE IF NOT EXISTS tasks (
    id uuid PRIMARY KEY, titulo text NOT NULL, descricao text NOT NULL DEFAULT '', cliente text NOT NULL DEFAULT '',
    responsavel text NOT NULL, status text NOT NULL, prioridade text NOT NULL, prazo text NOT NULL DEFAULT '',
    comentarios jsonb NOT NULL DEFAULT '[]', criado_por text NOT NULL, criado_em timestamptz NOT NULL, atualizado_em timestamptz NOT NULL)`;
  await pool.sql`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS cliente text NOT NULL DEFAULT ''`;
  if (RESET) await pool.sql`DELETE FROM tasks`;
  const existentes = (await pool.sql`SELECT titulo, cliente FROM tasks`).rows.map((r) => r.titulo + "␟" + r.cliente);
  let add = 0;
  for (const t of novas) {
    if (existentes.includes(t.titulo + "␟" + t.cliente)) continue;
    await pool.sql`INSERT INTO tasks (id, titulo, descricao, cliente, responsavel, status, prioridade, prazo, comentarios, criado_por, criado_em, atualizado_em)
      VALUES (${t.id}, ${t.titulo}, ${t.descricao}, ${t.cliente}, ${t.responsavel}, ${t.status}, ${t.prioridade}, ${t.prazo}, ${JSON.stringify(t.comentarios)}::jsonb, ${t.criadoPor}, ${t.criadoEm}, ${t.atualizadoEm})`;
    add++;
  }
  return add;
}

function importarJson() {
  const file = path.join(ROOT, "data", "tasks.json");
  let atuais = [];
  if (!RESET && fs.existsSync(file)) {
    try {
      atuais = JSON.parse(fs.readFileSync(file, "utf8"));
    } catch {
      atuais = [];
    }
  }
  const chaves = new Set(atuais.map((t) => t.titulo + "␟" + (t.cliente ?? "")));
  let add = 0;
  for (const t of novas) {
    if (chaves.has(t.titulo + "␟" + t.cliente)) continue;
    atuais.push(t);
    add++;
  }
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(atuais, null, 2), "utf8");
  return add;
}

const url = getDbUrl();
const add = url ? await importarPostgres(url) : importarJson();
console.log(`Destino: ${url ? "PostgreSQL" : "data/tasks.json (local)"}${RESET ? " [RESET]" : ""}`);
console.log(`Tarefas importadas: ${add} de ${novas.length}`);
console.log("Exemplo:", JSON.stringify({ titulo: novas[0].titulo, cliente: novas[0].cliente, descricao: novas[0].descricao, comentarios: novas[0].comentarios.map((c) => c.texto) }, null, 2));

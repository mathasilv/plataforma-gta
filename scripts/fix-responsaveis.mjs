/**
 * Corrige tarefas já importadas cujo responsável está como NOME, convertendo
 * para o e-mail do usuário cadastrado (para vincular à conta e não duplicar no
 * filtro). Idempotente.
 *
 *   node scripts/fix-responsaveis.mjs                     # data/tasks.json (dev)
 *   POSTGRES_URL="..." node scripts/fix-responsaveis.mjs  # banco (produção)
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const NOME_EMAIL = {
  Gabriel: "gabriel@gtaenergia.com",
  Marcela: "marcela@gtaenergia.com",
  Matheus: "matheus@gtaenergia.com",
  "Paulo Vitor": "paulovitor@gtaenergia.com",
  Tito: "tito@gtaenergia.com",
};

function getDbUrl() {
  const raw = process.env.POSTGRES_URL || process.env.DATABASE_URL || "";
  return raw.replace(/([?&])channel_binding=[^&]*/gi, "$1").replace(/\?&/, "?").replace(/[?&]$/, "");
}

const url = getDbUrl();

if (url) {
  const { createRequire } = await import("node:module");
  const require = createRequire(import.meta.url);
  const { createPool } = require("@vercel/postgres");
  const pool = createPool({ connectionString: url });
  let total = 0;
  for (const [nome, email] of Object.entries(NOME_EMAIL)) {
    const { rowCount } = await pool.sql`UPDATE tasks SET responsavel = ${email} WHERE responsavel = ${nome}`;
    if (rowCount) console.log(`  ${nome} -> ${email}: ${rowCount} tarefa(s)`);
    total += rowCount ?? 0;
  }
  console.log(`Destino: PostgreSQL | tarefas atualizadas: ${total}`);
} else {
  const file = path.join(ROOT, "data", "tasks.json");
  const tasks = JSON.parse(fs.readFileSync(file, "utf8"));
  let total = 0;
  for (const t of tasks) {
    if (NOME_EMAIL[t.responsavel]) {
      t.responsavel = NOME_EMAIL[t.responsavel];
      total++;
    }
  }
  fs.writeFileSync(file, JSON.stringify(tasks, null, 2), "utf8");
  console.log(`Destino: data/tasks.json | tarefas atualizadas: ${total}`);
}

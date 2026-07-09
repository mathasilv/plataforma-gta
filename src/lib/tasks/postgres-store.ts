import { createPool, type VercelPool } from "@vercel/postgres";
import crypto from "node:crypto";
import type { Comentario, Task } from "./types";
import type { TaskStore } from "./store";

/**
 * Implementação do TaskStore em PostgreSQL (Vercel Postgres / Neon).
 *
 * Usada em produção. A conexão vem de uma das variáveis de ambiente injetadas
 * pela Vercel ao vincular o banco (o nome varia entre POSTGRES_URL e
 * DATABASE_URL conforme o provedor) — por isso escolhemos a primeira disponível.
 * Mantém a MESMA interface do JsonTaskStore — API e UI não mudam.
 */

/**
 * Remove o parâmetro `channel_binding` da URL. O Neon o inclui por padrão, mas o
 * driver serverless (@vercel/postgres) pode falhar com `channel_binding=require`.
 * Tirá-lo torna a conexão TLS opcional para binding — mais compatível, sem perda
 * de segurança (a conexão continua por SSL).
 */
function sanitize(url: string): string {
  return url
    .replace(/([?&])channel_binding=[^&]*/gi, "$1")
    .replace(/\?&/, "?")
    .replace(/&&/g, "&")
    .replace(/[?&]$/, "");
}

/** Primeira URL de conexão disponível (compatível com Vercel Postgres e Neon). */
export function getDbUrl(): string {
  const url =
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL_NON_POOLING ||
    "";
  return url ? sanitize(url) : "";
}

interface Row {
  id: string;
  titulo: string;
  descricao: string;
  cliente: string;
  demandante: string;
  responsavel: string;
  status: string;
  prioridade: string;
  prazo: string;
  comentarios: Comentario[];
  criado_por: string;
  criado_em: string;
  atualizado_em: string;
}

function rowToTask(r: Row): Task {
  return {
    id: r.id,
    titulo: r.titulo,
    descricao: r.descricao,
    cliente: r.cliente ?? "",
    demandante: r.demandante ?? "",
    responsavel: r.responsavel,
    status: r.status as Task["status"],
    prioridade: r.prioridade as Task["prioridade"],
    prazo: r.prazo,
    comentarios: r.comentarios ?? [],
    criadoPor: r.criado_por,
    criadoEm: new Date(r.criado_em).toISOString(),
    atualizadoEm: new Date(r.atualizado_em).toISOString(),
  };
}

export class PostgresTaskStore implements TaskStore {
  private pool: VercelPool;
  private ready: Promise<void> | null = null;

  constructor() {
    this.pool = createPool({ connectionString: getDbUrl() });
  }

  /** Cria a tabela na primeira operação (idempotente). */
  private ensureSchema(): Promise<void> {
    if (!this.ready) {
      this.ready = this.pool
        .sql`
        CREATE TABLE IF NOT EXISTS tasks (
          id uuid PRIMARY KEY,
          titulo text NOT NULL,
          descricao text NOT NULL DEFAULT '',
          cliente text NOT NULL DEFAULT '',
          demandante text NOT NULL DEFAULT '',
          responsavel text NOT NULL,
          status text NOT NULL,
          prioridade text NOT NULL,
          prazo text NOT NULL DEFAULT '',
          comentarios jsonb NOT NULL DEFAULT '[]',
          criado_por text NOT NULL,
          criado_em timestamptz NOT NULL,
          atualizado_em timestamptz NOT NULL
        )
      `
        // Garante as colunas em tabelas criadas antes desses campos existirem
        .then(() => this.pool.sql`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS cliente text NOT NULL DEFAULT ''`)
        .then(() => this.pool.sql`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS demandante text NOT NULL DEFAULT ''`)
        .then(() => undefined);
    }
    return this.ready;
  }

  async list(): Promise<Task[]> {
    await this.ensureSchema();
    const { rows } = await this.pool.sql<Row>`SELECT * FROM tasks ORDER BY atualizado_em DESC`;
    return rows.map(rowToTask);
  }

  async get(id: string): Promise<Task | null> {
    await this.ensureSchema();
    const { rows } = await this.pool.sql<Row>`SELECT * FROM tasks WHERE id = ${id}`;
    return rows[0] ? rowToTask(rows[0]) : null;
  }

  async create(
    data: Omit<Task, "id" | "comentarios" | "criadoEm" | "atualizadoEm">,
  ): Promise<Task> {
    await this.ensureSchema();
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await this.pool.sql`
      INSERT INTO tasks
        (id, titulo, descricao, cliente, demandante, responsavel, status, prioridade, prazo, comentarios, criado_por, criado_em, atualizado_em)
      VALUES
        (${id}, ${data.titulo}, ${data.descricao}, ${data.cliente}, ${data.demandante}, ${data.responsavel}, ${data.status},
         ${data.prioridade}, ${data.prazo}, '[]'::jsonb, ${data.criadoPor}, ${now}, ${now})
    `;
    return { ...data, id, comentarios: [], criadoEm: now, atualizadoEm: now };
  }

  async update(
    id: string,
    patch: Partial<Omit<Task, "id" | "comentarios">>,
  ): Promise<Task | null> {
    await this.ensureSchema();
    // UPDATE atômico (sem read-then-write): COALESCE mantém o valor atual quando
    // o campo não foi enviado (null), evitando que edições simultâneas se
    // sobrescrevam em campos diferentes. RETURNING devolve a linha final.
    const atualizadoEm = new Date().toISOString();
    const { rows } = await this.pool.sql<Row>`
      UPDATE tasks SET
        titulo = COALESCE(${patch.titulo ?? null}::text, titulo),
        descricao = COALESCE(${patch.descricao ?? null}::text, descricao),
        cliente = COALESCE(${patch.cliente ?? null}::text, cliente),
        demandante = COALESCE(${patch.demandante ?? null}::text, demandante),
        responsavel = COALESCE(${patch.responsavel ?? null}::text, responsavel),
        status = COALESCE(${patch.status ?? null}::text, status),
        prioridade = COALESCE(${patch.prioridade ?? null}::text, prioridade),
        prazo = COALESCE(${patch.prazo ?? null}::text, prazo),
        atualizado_em = ${atualizadoEm}
      WHERE id = ${id}
      RETURNING *
    `;
    return rows[0] ? rowToTask(rows[0]) : null;
  }

  async remove(id: string): Promise<boolean> {
    await this.ensureSchema();
    const { rowCount } = await this.pool.sql`DELETE FROM tasks WHERE id = ${id}`;
    return (rowCount ?? 0) > 0;
  }

  async addComment(id: string, comentario: Omit<Comentario, "id" | "em">): Promise<Task | null> {
    await this.ensureSchema();
    const novo: Comentario = { ...comentario, id: crypto.randomUUID(), em: new Date().toISOString() };
    // Append atômico no jsonb + atualiza timestamp
    const { rows } = await this.pool.sql<Row>`
      UPDATE tasks SET
        comentarios = comentarios || ${JSON.stringify([novo])}::jsonb,
        atualizado_em = ${novo.em}
      WHERE id = ${id}
      RETURNING *
    `;
    return rows[0] ? rowToTask(rows[0]) : null;
  }
}

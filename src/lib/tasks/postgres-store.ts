import { sql } from "@vercel/postgres";
import crypto from "node:crypto";
import type { Comentario, Task } from "./types";
import type { TaskStore } from "./store";

/**
 * Implementação do TaskStore em PostgreSQL (Vercel Postgres).
 *
 * Usada em produção. Lê a conexão da env `POSTGRES_URL` (injetada
 * automaticamente pela Vercel ao vincular um banco Postgres ao projeto).
 * Mantém a MESMA interface do JsonTaskStore — API e UI não mudam.
 */

interface Row {
  id: string;
  titulo: string;
  descricao: string;
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
  private ready: Promise<void> | null = null;

  /** Cria a tabela na primeira operação (idempotente). */
  private ensureSchema(): Promise<void> {
    if (!this.ready) {
      this.ready = sql`
        CREATE TABLE IF NOT EXISTS tasks (
          id uuid PRIMARY KEY,
          titulo text NOT NULL,
          descricao text NOT NULL DEFAULT '',
          responsavel text NOT NULL,
          status text NOT NULL,
          prioridade text NOT NULL,
          prazo text NOT NULL DEFAULT '',
          comentarios jsonb NOT NULL DEFAULT '[]',
          criado_por text NOT NULL,
          criado_em timestamptz NOT NULL,
          atualizado_em timestamptz NOT NULL
        )
      `.then(() => undefined);
    }
    return this.ready;
  }

  async list(): Promise<Task[]> {
    await this.ensureSchema();
    const { rows } = await sql<Row>`SELECT * FROM tasks ORDER BY atualizado_em DESC`;
    return rows.map(rowToTask);
  }

  async get(id: string): Promise<Task | null> {
    await this.ensureSchema();
    const { rows } = await sql<Row>`SELECT * FROM tasks WHERE id = ${id}`;
    return rows[0] ? rowToTask(rows[0]) : null;
  }

  async create(
    data: Omit<Task, "id" | "comentarios" | "criadoEm" | "atualizadoEm">,
  ): Promise<Task> {
    await this.ensureSchema();
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await sql`
      INSERT INTO tasks
        (id, titulo, descricao, responsavel, status, prioridade, prazo, comentarios, criado_por, criado_em, atualizado_em)
      VALUES
        (${id}, ${data.titulo}, ${data.descricao}, ${data.responsavel}, ${data.status},
         ${data.prioridade}, ${data.prazo}, '[]'::jsonb, ${data.criadoPor}, ${now}, ${now})
    `;
    return { ...data, id, comentarios: [], criadoEm: now, atualizadoEm: now };
  }

  async update(
    id: string,
    patch: Partial<Omit<Task, "id" | "comentarios">>,
  ): Promise<Task | null> {
    await this.ensureSchema();
    const current = await this.get(id);
    if (!current) return null;
    const next: Task = { ...current, ...patch, id, atualizadoEm: new Date().toISOString() };
    await sql`
      UPDATE tasks SET
        titulo = ${next.titulo},
        descricao = ${next.descricao},
        responsavel = ${next.responsavel},
        status = ${next.status},
        prioridade = ${next.prioridade},
        prazo = ${next.prazo},
        atualizado_em = ${next.atualizadoEm}
      WHERE id = ${id}
    `;
    return next;
  }

  async remove(id: string): Promise<boolean> {
    await this.ensureSchema();
    const { rowCount } = await sql`DELETE FROM tasks WHERE id = ${id}`;
    return (rowCount ?? 0) > 0;
  }

  async addComment(id: string, comentario: Omit<Comentario, "id" | "em">): Promise<Task | null> {
    await this.ensureSchema();
    const novo: Comentario = { ...comentario, id: crypto.randomUUID(), em: new Date().toISOString() };
    // Append atômico no jsonb + atualiza timestamp
    const { rows } = await sql<Row>`
      UPDATE tasks SET
        comentarios = comentarios || ${JSON.stringify([novo])}::jsonb,
        atualizado_em = ${novo.em}
      WHERE id = ${id}
      RETURNING *
    `;
    return rows[0] ? rowToTask(rows[0]) : null;
  }
}

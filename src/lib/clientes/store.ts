import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { createPool, type VercelPool } from "@vercel/postgres";
import type { Cliente } from "./types";
import { getDbUrl } from "../tasks/postgres-store";

/**
 * Camada de dados dos Clientes (cadastro). Mesmo padrão das demais camadas:
 * Postgres em produção, arquivo JSON local em desenvolvimento.
 */

type CreateInput = Omit<Cliente, "id" | "criadoEm" | "atualizadoEm">;
type UpdatePatch = Partial<Omit<Cliente, "id" | "criadoEm" | "criadoPor">>;

export interface ClienteStore {
  list(): Promise<Cliente[]>;
  get(id: string): Promise<Cliente | null>;
  create(data: CreateInput): Promise<Cliente>;
  update(id: string, patch: UpdatePatch): Promise<Cliente | null>;
  remove(id: string): Promise<boolean>;
}

// ------------------------------------------------------------- JSON (dev)

class JsonClienteStore implements ClienteStore {
  private queue: Promise<unknown> = Promise.resolve();
  constructor(private file: string) {}

  private readAll(): Cliente[] {
    try {
      const parsed = JSON.parse(fs.readFileSync(this.file, "utf8"));
      return Array.isArray(parsed) ? (parsed as Cliente[]) : [];
    } catch {
      return [];
    }
  }
  private writeAll(items: Cliente[]): void {
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    const tmp = `${this.file}.${process.pid}.${Date.now()}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(items, null, 2), "utf8");
    fs.renameSync(tmp, this.file);
  }
  private mutate<T>(fn: (items: Cliente[]) => { items: Cliente[]; result: T }): Promise<T> {
    const run = this.queue.then(() => {
      const { items, result } = fn(this.readAll());
      this.writeAll(items);
      return result;
    });
    this.queue = run.catch(() => undefined);
    return run;
  }

  async list() {
    return this.readAll().sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  }
  async get(id: string) {
    return this.readAll().find((c) => c.id === id) ?? null;
  }
  async create(data: CreateInput) {
    const now = new Date().toISOString();
    const c: Cliente = { ...data, id: crypto.randomUUID(), criadoEm: now, atualizadoEm: now };
    return this.mutate((items) => ({ items: [...items, c], result: c }));
  }
  async update(id: string, patch: UpdatePatch) {
    return this.mutate((items) => {
      const i = items.findIndex((c) => c.id === id);
      if (i < 0) return { items, result: null };
      const updated: Cliente = { ...items[i], ...patch, id, atualizadoEm: new Date().toISOString() };
      const next = [...items];
      next[i] = updated;
      return { items: next, result: updated };
    });
  }
  async remove(id: string) {
    return this.mutate((items) => {
      const next = items.filter((c) => c.id !== id);
      return { items: next, result: next.length !== items.length };
    });
  }
}

// --------------------------------------------------------- Postgres (prod)

interface Row {
  id: string;
  nome: string;
  tipo_pessoa: string;
  documento: string;
  contato_nome: string;
  telefone: string;
  email: string;
  cep: string;
  logradouro: string;
  numero: string;
  bairro: string;
  cidade: string;
  uf: string;
  segmento: string;
  observacoes: string;
  criado_por: string;
  criado_por_nome: string | null;
  criado_em: string;
  atualizado_em: string;
}
const rowTo = (r: Row): Cliente => ({
  id: r.id,
  nome: r.nome,
  tipoPessoa: (r.tipo_pessoa as Cliente["tipoPessoa"]) ?? "PJ",
  documento: r.documento ?? "",
  contatoNome: r.contato_nome ?? "",
  telefone: r.telefone ?? "",
  email: r.email ?? "",
  cep: r.cep ?? "",
  logradouro: r.logradouro ?? "",
  numero: r.numero ?? "",
  bairro: r.bairro ?? "",
  cidade: r.cidade ?? "",
  uf: r.uf ?? "",
  segmento: r.segmento ?? "",
  observacoes: r.observacoes ?? "",
  criadoPor: r.criado_por,
  criadoPorNome: r.criado_por_nome ?? undefined,
  criadoEm: new Date(r.criado_em).toISOString(),
  atualizadoEm: new Date(r.atualizado_em).toISOString(),
});

class PostgresClienteStore implements ClienteStore {
  private pool: VercelPool;
  private ready: Promise<void> | null = null;
  constructor() {
    this.pool = createPool({ connectionString: getDbUrl() });
  }
  private ensureSchema(): Promise<void> {
    if (!this.ready) {
      this.ready = this.pool.sql`
        CREATE TABLE IF NOT EXISTS clientes (
          id uuid PRIMARY KEY,
          nome text NOT NULL,
          tipo_pessoa text NOT NULL DEFAULT 'PJ',
          documento text NOT NULL DEFAULT '',
          contato_nome text NOT NULL DEFAULT '',
          telefone text NOT NULL DEFAULT '',
          email text NOT NULL DEFAULT '',
          cep text NOT NULL DEFAULT '',
          logradouro text NOT NULL DEFAULT '',
          numero text NOT NULL DEFAULT '',
          bairro text NOT NULL DEFAULT '',
          cidade text NOT NULL DEFAULT '',
          uf text NOT NULL DEFAULT '',
          segmento text NOT NULL DEFAULT '',
          observacoes text NOT NULL DEFAULT '',
          criado_por text NOT NULL,
          criado_por_nome text,
          criado_em timestamptz NOT NULL,
          atualizado_em timestamptz NOT NULL
        )
      `
        .then(() => undefined)
        // Blip transitório no cold start não pode virar rejeição cacheada para sempre.
        .catch((e) => {
          this.ready = null;
          throw e;
        });
    }
    return this.ready;
  }
  async list() {
    await this.ensureSchema();
    const { rows } = await this.pool.sql<Row>`SELECT * FROM clientes ORDER BY nome ASC`;
    return rows.map(rowTo);
  }
  async get(id: string) {
    await this.ensureSchema();
    const { rows } = await this.pool.sql<Row>`SELECT * FROM clientes WHERE id = ${id}`;
    return rows[0] ? rowTo(rows[0]) : null;
  }
  async create(data: CreateInput) {
    await this.ensureSchema();
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await this.pool.sql`
      INSERT INTO clientes
        (id, nome, tipo_pessoa, documento, contato_nome, telefone, email, cep, logradouro, numero,
         bairro, cidade, uf, segmento, observacoes, criado_por, criado_por_nome, criado_em, atualizado_em)
      VALUES
        (${id}, ${data.nome}, ${data.tipoPessoa}, ${data.documento}, ${data.contatoNome}, ${data.telefone},
         ${data.email}, ${data.cep}, ${data.logradouro}, ${data.numero}, ${data.bairro}, ${data.cidade},
         ${data.uf}, ${data.segmento}, ${data.observacoes}, ${data.criadoPor}, ${data.criadoPorNome ?? null}, ${now}, ${now})
    `;
    return { ...data, id, criadoEm: now, atualizadoEm: now };
  }
  async update(id: string, patch: UpdatePatch) {
    await this.ensureSchema();
    const atualizadoEm = new Date().toISOString();
    const { rows } = await this.pool.sql<Row>`
      UPDATE clientes SET
        nome = COALESCE(${patch.nome ?? null}::text, nome),
        tipo_pessoa = COALESCE(${patch.tipoPessoa ?? null}::text, tipo_pessoa),
        documento = COALESCE(${patch.documento ?? null}::text, documento),
        contato_nome = COALESCE(${patch.contatoNome ?? null}::text, contato_nome),
        telefone = COALESCE(${patch.telefone ?? null}::text, telefone),
        email = COALESCE(${patch.email ?? null}::text, email),
        cep = COALESCE(${patch.cep ?? null}::text, cep),
        logradouro = COALESCE(${patch.logradouro ?? null}::text, logradouro),
        numero = COALESCE(${patch.numero ?? null}::text, numero),
        bairro = COALESCE(${patch.bairro ?? null}::text, bairro),
        cidade = COALESCE(${patch.cidade ?? null}::text, cidade),
        uf = COALESCE(${patch.uf ?? null}::text, uf),
        segmento = COALESCE(${patch.segmento ?? null}::text, segmento),
        observacoes = COALESCE(${patch.observacoes ?? null}::text, observacoes),
        atualizado_em = ${atualizadoEm}
      WHERE id = ${id}
      RETURNING *
    `;
    return rows[0] ? rowTo(rows[0]) : null;
  }
  async remove(id: string) {
    await this.ensureSchema();
    const { rowCount } = await this.pool.sql`DELETE FROM clientes WHERE id = ${id}`;
    return (rowCount ?? 0) > 0;
  }
}

const g = globalThis as unknown as { __gtaClienteStore?: ClienteStore };

export function getClienteStore(): ClienteStore {
  if (!g.__gtaClienteStore) {
    g.__gtaClienteStore = getDbUrl()
      ? new PostgresClienteStore()
      : new JsonClienteStore(path.join(process.cwd(), "data", "clientes.json"));
  }
  return g.__gtaClienteStore;
}

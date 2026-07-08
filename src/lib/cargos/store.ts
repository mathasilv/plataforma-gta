import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { createPool, type VercelPool } from "@vercel/postgres";
import type { Cargo } from "./types";
import type { PermissaoKey } from "@/lib/rbac/permissoes";
import { getDbUrl } from "../tasks/postgres-store";

/**
 * Camada de dados dos Cargos. Mesmo padrão de Propostas/Usuários:
 * - Produção: PostgresCargoStore.
 * - Desenvolvimento: JsonCargoStore (data/cargos.json).
 * Semeia dois cargos de exemplo (Operacional/Comercial) na 1ª carga — editáveis.
 */

export interface NewCargo {
  nome: string;
  permissoes: PermissaoKey[];
  builtin?: boolean;
}

export interface CargoStore {
  list(): Promise<Cargo[]>;
  count(): Promise<number>;
  get(id: string): Promise<Cargo | null>;
  create(data: NewCargo): Promise<Cargo>;
  update(id: string, patch: Partial<Pick<Cargo, "nome" | "permissoes">>): Promise<Cargo | null>;
  remove(id: string): Promise<boolean>;
}

// ---------------------------------------------------------------- JSON (dev)

class JsonCargoStore implements CargoStore {
  private queue: Promise<unknown> = Promise.resolve();
  constructor(private file: string) {}

  private readAll(): Cargo[] {
    try {
      const parsed = JSON.parse(fs.readFileSync(this.file, "utf8"));
      return Array.isArray(parsed) ? (parsed as Cargo[]) : [];
    } catch {
      return [];
    }
  }
  private writeAll(items: Cargo[]): void {
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    const tmp = `${this.file}.${process.pid}.${Date.now()}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(items, null, 2), "utf8");
    fs.renameSync(tmp, this.file);
  }
  private mutate<T>(fn: (items: Cargo[]) => { items: Cargo[]; result: T }): Promise<T> {
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
  async count() {
    return this.readAll().length;
  }
  async get(id: string) {
    return this.readAll().find((c) => c.id === id) ?? null;
  }
  async create(data: NewCargo) {
    const now = new Date().toISOString();
    const cargo: Cargo = {
      id: crypto.randomUUID(),
      nome: data.nome,
      permissoes: data.permissoes,
      builtin: data.builtin ?? false,
      criadoEm: now,
      atualizadoEm: now,
    };
    return this.mutate((items) => ({ items: [...items, cargo], result: cargo }));
  }
  async update(id: string, patch: Partial<Pick<Cargo, "nome" | "permissoes">>) {
    return this.mutate((items) => {
      const i = items.findIndex((c) => c.id === id);
      if (i < 0) return { items, result: null };
      const updated: Cargo = { ...items[i], ...patch, atualizadoEm: new Date().toISOString() };
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

// ------------------------------------------------------------ Postgres (prod)

interface Row {
  id: string;
  nome: string;
  permissoes: PermissaoKey[];
  builtin: boolean;
  criado_em: string;
  atualizado_em: string;
}
const rowToCargo = (r: Row): Cargo => ({
  id: r.id,
  nome: r.nome,
  permissoes: r.permissoes ?? [],
  builtin: r.builtin,
  criadoEm: new Date(r.criado_em).toISOString(),
  atualizadoEm: new Date(r.atualizado_em).toISOString(),
});

class PostgresCargoStore implements CargoStore {
  private pool: VercelPool;
  private ready: Promise<void> | null = null;
  constructor() {
    this.pool = createPool({ connectionString: getDbUrl() });
  }
  private ensureSchema(): Promise<void> {
    if (!this.ready) {
      this.ready = this.pool.sql`
        CREATE TABLE IF NOT EXISTS cargos (
          id uuid PRIMARY KEY,
          nome text NOT NULL,
          permissoes jsonb NOT NULL DEFAULT '[]',
          builtin boolean NOT NULL DEFAULT false,
          criado_em timestamptz NOT NULL,
          atualizado_em timestamptz NOT NULL
        )
      `.then(() => undefined);
    }
    return this.ready;
  }
  async list() {
    await this.ensureSchema();
    const { rows } = await this.pool.sql<Row>`SELECT * FROM cargos ORDER BY nome ASC`;
    return rows.map(rowToCargo);
  }
  async count() {
    await this.ensureSchema();
    const { rows } = await this.pool.sql<{ n: number }>`SELECT COUNT(*)::int AS n FROM cargos`;
    return rows[0]?.n ?? 0;
  }
  async get(id: string) {
    await this.ensureSchema();
    const { rows } = await this.pool.sql<Row>`SELECT * FROM cargos WHERE id = ${id}`;
    return rows[0] ? rowToCargo(rows[0]) : null;
  }
  async create(data: NewCargo) {
    await this.ensureSchema();
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await this.pool.sql`
      INSERT INTO cargos (id, nome, permissoes, builtin, criado_em, atualizado_em)
      VALUES (${id}, ${data.nome}, ${JSON.stringify(data.permissoes)}::jsonb, ${data.builtin ?? false}, ${now}, ${now})
    `;
    return { id, nome: data.nome, permissoes: data.permissoes, builtin: data.builtin ?? false, criadoEm: now, atualizadoEm: now };
  }
  async update(id: string, patch: Partial<Pick<Cargo, "nome" | "permissoes">>) {
    await this.ensureSchema();
    const atualizadoEm = new Date().toISOString();
    const permJson = patch.permissoes === undefined ? null : JSON.stringify(patch.permissoes);
    const { rows } = await this.pool.sql<Row>`
      UPDATE cargos SET
        nome = COALESCE(${patch.nome ?? null}::text, nome),
        permissoes = COALESCE(${permJson}::jsonb, permissoes),
        atualizado_em = ${atualizadoEm}
      WHERE id = ${id}
      RETURNING *
    `;
    return rows[0] ? rowToCargo(rows[0]) : null;
  }
  async remove(id: string) {
    await this.ensureSchema();
    const { rowCount } = await this.pool.sql`DELETE FROM cargos WHERE id = ${id}`;
    return (rowCount ?? 0) > 0;
  }
}

// ------------------------------------------------------------------ seleção + seed

const g = globalThis as unknown as { __gtaCargoStore?: CargoStore; __gtaCargoSeed?: Promise<void> };

function getCargoStore(): CargoStore {
  if (!g.__gtaCargoStore) {
    g.__gtaCargoStore = getDbUrl()
      ? new PostgresCargoStore()
      : new JsonCargoStore(path.join(process.cwd(), "data", "cargos.json"));
  }
  return g.__gtaCargoStore;
}

/** Cargos de exemplo para a plataforma já nascer utilizável (editáveis pelo admin). */
const SEED: NewCargo[] = [
  { nome: "Operacional", permissoes: ["orcamentos.criar", "servicos.editar", "propostas.gerar"], builtin: true },
  { nome: "Comercial", permissoes: ["orcamentos.revisar", "orcamentos.cancelar"], builtin: true },
];

async function seed(store: CargoStore): Promise<void> {
  if ((await store.count()) > 0) return;
  for (const c of SEED) {
    try {
      await store.create(c);
    } catch {
      // criação concorrente — ignora
    }
  }
}

/** Acessa o store garantindo a semeadura inicial (idempotente). */
export async function cargos(): Promise<CargoStore> {
  const store = getCargoStore();
  if (!g.__gtaCargoSeed) g.__gtaCargoSeed = seed(store);
  await g.__gtaCargoSeed;
  return store;
}

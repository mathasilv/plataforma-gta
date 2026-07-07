import fs from "node:fs";
import path from "node:path";
import { createPool, type VercelPool } from "@vercel/postgres";
import { getDbUrl } from "../tasks/postgres-store";

/**
 * Configurações da plataforma (chave -> valor JSON). Mesmo padrão das demais
 * camadas de dados: Postgres em produção, arquivo JSON local em desenvolvimento.
 * Usado p.ex. pelos parâmetros de preço do Solar (/admin/parametros).
 */

export interface SettingsStore {
  get<T>(key: string): Promise<T | null>;
  set(key: string, value: unknown, updatedBy: string): Promise<void>;
}

// ------------------------------------------------------------- JSON (dev)

class JsonSettingsStore implements SettingsStore {
  private queue: Promise<unknown> = Promise.resolve();
  constructor(private file: string) {}

  private readAll(): Record<string, unknown> {
    try {
      const parsed = JSON.parse(fs.readFileSync(this.file, "utf8"));
      return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
    } catch {
      return {};
    }
  }

  async get<T>(key: string): Promise<T | null> {
    const all = this.readAll();
    return key in all ? (all[key] as T) : null;
  }

  async set(key: string, value: unknown): Promise<void> {
    const run = this.queue.then(() => {
      const all = this.readAll();
      all[key] = value;
      fs.mkdirSync(path.dirname(this.file), { recursive: true });
      const tmp = `${this.file}.${process.pid}.${Date.now()}.tmp`;
      fs.writeFileSync(tmp, JSON.stringify(all, null, 2), "utf8");
      fs.renameSync(tmp, this.file);
    });
    this.queue = run.catch(() => undefined);
    return run;
  }
}

// --------------------------------------------------------- Postgres (prod)

class PostgresSettingsStore implements SettingsStore {
  private pool: VercelPool;
  private ready: Promise<void> | null = null;
  constructor() {
    this.pool = createPool({ connectionString: getDbUrl() });
  }
  private ensureSchema(): Promise<void> {
    if (!this.ready) {
      this.ready = this.pool.sql`
        CREATE TABLE IF NOT EXISTS settings (
          key text PRIMARY KEY,
          value jsonb NOT NULL,
          atualizado_por text NOT NULL DEFAULT '',
          atualizado_em timestamptz NOT NULL
        )
      `.then(() => undefined);
    }
    return this.ready;
  }

  async get<T>(key: string): Promise<T | null> {
    await this.ensureSchema();
    const { rows } = await this.pool.sql<{ value: T }>`SELECT value FROM settings WHERE key = ${key}`;
    return rows[0] ? rows[0].value : null;
  }

  async set(key: string, value: unknown, updatedBy: string): Promise<void> {
    await this.ensureSchema();
    const now = new Date().toISOString();
    await this.pool.sql`
      INSERT INTO settings (key, value, atualizado_por, atualizado_em)
      VALUES (${key}, ${JSON.stringify(value)}::jsonb, ${updatedBy}, ${now})
      ON CONFLICT (key) DO UPDATE
        SET value = EXCLUDED.value,
            atualizado_por = EXCLUDED.atualizado_por,
            atualizado_em = EXCLUDED.atualizado_em
    `;
  }
}

const g = globalThis as unknown as { __gtaSettingsStore?: SettingsStore };

export function getSettingsStore(): SettingsStore {
  if (!g.__gtaSettingsStore) {
    g.__gtaSettingsStore = getDbUrl()
      ? new PostgresSettingsStore()
      : new JsonSettingsStore(path.join(process.cwd(), "data", "settings.json"));
  }
  return g.__gtaSettingsStore;
}

import { mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import Database from 'better-sqlite3'
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import * as schema from './schema'

export type Db = BetterSQLite3Database<typeof schema>

export interface DbHandle {
  db: Db
  sqlite: Database.Database
  close: () => void
}

/** Migrations are shipped next to the server (see Dockerfile) and resolved from the working directory. */
export const DEFAULT_MIGRATIONS_DIR = resolve(process.cwd(), 'server/db/migrations')

export function openDatabase(path: string): DbHandle {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true })
  const sqlite = new Database(path)
  sqlite.pragma('journal_mode = WAL')
  sqlite.pragma('foreign_keys = ON')
  sqlite.pragma('busy_timeout = 5000')
  const db = drizzle(sqlite, { schema })
  return { db, sqlite, close: () => sqlite.close() }
}

export function runMigrations(handle: DbHandle, migrationsFolder: string = DEFAULT_MIGRATIONS_DIR): void {
  migrate(handle.db, { migrationsFolder })
}

export function isDatabaseHealthy(handle: DbHandle | undefined): boolean {
  if (!handle) return false
  try {
    handle.sqlite.prepare('select 1').get()
    return true
  }
  catch {
    return false
  }
}

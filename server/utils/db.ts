import { openDatabase, runMigrations, type Db, type DbHandle } from '../db/client'
import { DEFAULT_DATABASE_PATH } from '../lib/config'

let handle: DbHandle | undefined

/** Opens the database and applies pending migrations. Called once at startup. */
export function initDatabase(): DbHandle {
  if (handle) return handle
  const opened = openDatabase(process.env.NUXT_DATABASE_PATH?.trim() || DEFAULT_DATABASE_PATH)
  try {
    runMigrations(opened)
  }
  catch (error) {
    opened.close()
    throw error
  }
  handle = opened
  return handle
}

export function getDatabaseHandle(): DbHandle | undefined {
  return handle
}

export function useDb(): Db {
  if (!handle) {
    throw createError({ status: 503, message: 'Database is not available' })
  }
  return handle.db
}

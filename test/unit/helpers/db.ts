import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { openDatabase, runMigrations, type DbHandle } from '../../../server/db/client'

export interface TempDb extends DbHandle {
  path: string
  dispose: () => void
}

export function createTempDb(): TempDb {
  const dir = mkdtempSync(join(tmpdir(), 'my-fitness-unit-'))
  const path = join(dir, 'fitness.db')
  const handle = openDatabase(path)
  runMigrations(handle)
  return {
    ...handle,
    path,
    dispose: () => {
      handle.close()
      rmSync(dir, { recursive: true, force: true })
    },
  }
}

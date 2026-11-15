import { existsSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { isDatabaseHealthy, openDatabase, runMigrations } from '../../server/db/client'
import { exercises } from '../../server/db/schema'

const dirs: string[] = []
function tempDir() {
  const dir = mkdtempSync(join(tmpdir(), 'my-fitness-db-'))
  dirs.push(dir)
  return dir
}

afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true })
})

describe('openDatabase', () => {
  it('creates missing parent folders and the database file', () => {
    const path = join(tempDir(), 'a', 'b', 'fitness.db')
    const handle = openDatabase(path)
    expect(existsSync(path)).toBe(true)
    handle.close()
  })

  it('enables WAL and foreign keys', () => {
    const handle = openDatabase(join(tempDir(), 'fitness.db'))
    expect(handle.sqlite.pragma('journal_mode', { simple: true })).toBe('wal')
    expect(handle.sqlite.pragma('foreign_keys', { simple: true })).toBe(1)
    handle.close()
  })

  it('supports an in-memory database', () => {
    const handle = openDatabase(':memory:')
    expect(isDatabaseHealthy(handle)).toBe(true)
    handle.close()
  })
})

describe('runMigrations', () => {
  it('creates all tables on an empty database', () => {
    const handle = openDatabase(join(tempDir(), 'fitness.db'))
    runMigrations(handle)
    const tables = handle.sqlite
      .prepare(`select name from sqlite_master where type = 'table' and name not like '\\_\\_%' escape '\\' and name not like 'sqlite_%'`)
      .all()
      .map((r: any) => r.name)
      .sort()
    expect(tables).toEqual(['exercises', 'sets', 'workout_exercises', 'workouts'])
    handle.close()
  })

  it('keeps existing rows when migrations run again', () => {
    const path = join(tempDir(), 'fitness.db')
    const first = openDatabase(path)
    runMigrations(first)
    first.db.insert(exercises).values({ name: 'Plank', nameKey: 'plank', kind: 'timed', createdAt: new Date() }).run()
    first.close()

    const second = openDatabase(path)
    runMigrations(second)
    expect(second.db.select().from(exercises).all()).toHaveLength(1)
    second.close()
  })
})

describe('isDatabaseHealthy', () => {
  it('is false without a handle', () => {
    expect(isDatabaseHealthy(undefined)).toBe(false)
  })

  it('is false after the database is closed', () => {
    const handle = openDatabase(join(tempDir(), 'fitness.db'))
    handle.close()
    expect(isDatabaseHealthy(handle)).toBe(false)
  })
})

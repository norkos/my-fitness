import { existsSync, rmSync } from 'node:fs'
import Database from 'better-sqlite3'
import { describe, expect, it } from 'vitest'
import { startApp, tempDbPath } from './helpers/app'

describe('database on startup', () => {
  it('creates and migrates a missing database file', async () => {
    const { dir, dbPath } = tempDbPath()
    expect(existsSync(dbPath)).toBe(false)
    const app = await startApp({ dbPath })
    await app.stop()

    expect(existsSync(dbPath)).toBe(true)
    const sqlite = new Database(dbPath, { readonly: true })
    const tables = sqlite.prepare(`select name from sqlite_master where type = 'table'`).all().map((r: any) => r.name)
    sqlite.close()
    expect(tables).toEqual(expect.arrayContaining(['exercises', 'workouts', 'workout_exercises', 'sets']))
    rmSync(dir, { recursive: true, force: true })
  })

  it('keeps existing data across restarts', async () => {
    const { dir, dbPath } = tempDbPath()
    const first = await startApp({ dbPath })
    await first.stop()

    const sqlite = new Database(dbPath)
    sqlite.prepare(`insert into exercises (name, name_key, kind, created_at) values ('Plank', 'plank', 'timed', 0)`).run()
    sqlite.close()

    const second = await startApp({ dbPath })
    await second.stop()

    const check = new Database(dbPath, { readonly: true })
    const count = check.prepare('select count(*) as n from exercises').get() as { n: number }
    check.close()
    expect(count.n).toBe(1)
    rmSync(dir, { recursive: true, force: true })
  })
})

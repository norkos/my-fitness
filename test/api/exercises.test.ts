import Database from 'better-sqlite3'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { startApp, type TestApp } from './helpers/app'

describe('exercises API', () => {
  let app: TestApp
  let cookie: string

  beforeAll(async () => {
    app = await startApp()
    cookie = await app.login()
  })

  afterAll(async () => {
    await app?.stop()
  })

  const post = (body: unknown) => app.request('/api/exercises', { method: 'POST', body, cookie })
  const patch = (id: number, body: unknown) => app.request(`/api/exercises/${id}`, { method: 'PATCH', body, cookie })

  it('creates an exercise', async () => {
    const res = await post({ name: 'Bench press', kind: 'weight_reps' })
    expect(res.status).toBe(201)
    expect(res.body).toMatchObject({ name: 'Bench press', kind: 'weight_reps', used: false })
  })

  it('rejects a duplicate name ignoring case and whitespace', async () => {
    const res = await post({ name: ' bench PRESS ', kind: 'weight_reps' })
    expect(res.status).toBe(409)
    expect(res.body.message).toBe('An exercise with this name already exists')
    expect(res.body.data.fieldErrors.name).toBeTruthy()
  })

  it('rejects a blank name with a field error', async () => {
    const res = await post({ name: '  ', kind: 'timed' })
    expect(res.status).toBe(400)
    expect(res.body.data.fieldErrors.name).toBe('Name is required')
  })

  it('rejects an invalid body', async () => {
    const res = await app.request('/api/exercises', { method: 'POST', cookie })
    expect(res.status).toBe(400)
  })

  it('lists exercises alphabetically with their kind', async () => {
    await post({ name: 'squat', kind: 'weight_reps' })
    await post({ name: 'Plank', kind: 'timed' })
    const res = await app.request('/api/exercises', { cookie })
    expect(res.status).toBe(200)
    expect(res.body.map((e: any) => [e.name, e.kind])).toEqual([
      ['Bench press', 'weight_reps'],
      ['Plank', 'timed'],
      ['squat', 'weight_reps'],
    ])
  })

  it('gets one exercise and returns 404 for unknown ids', async () => {
    const list = (await app.request('/api/exercises', { cookie })).body
    const one = await app.request(`/api/exercises/${list[0].id}`, { cookie })
    expect(one.body.name).toBe('Bench press')
    expect((await app.request('/api/exercises/9999', { cookie })).status).toBe(404)
    expect((await app.request('/api/exercises/abc', { cookie })).status).toBe(404)
  })

  it('renames an exercise', async () => {
    const created = (await post({ name: 'Rowing', kind: 'cardio' })).body
    const res = await patch(created.id, { name: 'Rowing machine' })
    expect(res.status).toBe(200)
    expect(res.body.name).toBe('Rowing machine')
  })

  it('rejects renaming onto an existing name', async () => {
    const created = (await post({ name: 'Lunge', kind: 'weight_reps' })).body
    expect((await patch(created.id, { name: 'SQUAT' })).status).toBe(409)
  })

  it('changes the kind only while unused', async () => {
    const created = (await post({ name: 'Pull-up', kind: 'weight_reps' })).body
    const changed = await patch(created.id, { kind: 'bodyweight' })
    expect(changed.status).toBe(200)
    expect(changed.body.kind).toBe('bodyweight')

    // Simulate logged history directly in the database file (WAL allows concurrent access).
    const sqlite = new Database(app.dbPath)
    const w = sqlite.prepare(`insert into workouts (date, session_type, created_at, updated_at) values ('2026-11-01', 'solo', 0, 0)`).run()
    const we = sqlite.prepare(`insert into workout_exercises (workout_id, exercise_id, position) values (?, ?, 0)`).run(w.lastInsertRowid, created.id)
    sqlite.prepare(`insert into sets (workout_exercise_id, position, reps) values (?, 0, 8)`).run(we.lastInsertRowid)
    sqlite.close()

    const rejected = await patch(created.id, { kind: 'timed' })
    expect(rejected.status).toBe(409)
    expect(rejected.body.message).toMatch(/cannot change/)

    const renamed = await patch(created.id, { name: 'Pull-ups' })
    expect(renamed.body).toMatchObject({ name: 'Pull-ups', kind: 'bodyweight', used: true })
  })

  it('sets, returns and clears a video link', async () => {
    const created = await post({ name: 'Side plank', kind: 'timed', videoUrl: 'https://example.com/videos/plank' })
    expect(created.status).toBe(201)
    expect(created.body).toMatchObject({ videoUrl: 'https://example.com/videos/plank', lastDoneOn: null })

    const listed = (await app.request('/api/exercises', { cookie })).body.find((e: any) => e.id === created.body.id)
    expect(listed.videoUrl).toBe('https://example.com/videos/plank')

    const bad = await patch(created.body.id, { videoUrl: 'javascript:alert(1)' })
    expect(bad.status).toBe(400)
    expect(bad.body.data.fieldErrors).toEqual({ videoUrl: 'Enter an https:// link' })

    expect((await patch(created.body.id, { videoUrl: '' })).body.videoUrl).toBeNull()
  })

  it('returns 404 when patching an unknown exercise', async () => {
    expect((await patch(9999, { name: 'Nope' })).status).toBe(404)
  })
})

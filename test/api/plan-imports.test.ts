import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { startApp, type TestApp } from './helpers/app'

describe('plan import API', () => {
  let app: TestApp
  let cookie: string

  beforeAll(async () => {
    app = await startApp()
    cookie = await app.login()
  })

  afterAll(async () => {
    await app?.stop()
  })

  const importPlan = (body: unknown, auth = cookie) => app.request('/api/plan-imports', { method: 'POST', cookie: auth, body })
  const exercisesNow = async () => (await app.request('/api/exercises', { cookie })).body as any[]

  it('creates new exercises and a draft listed as planned, keeping existing videos', async () => {
    const plank = (await app.request('/api/exercises', { method: 'POST', cookie, body: { name: 'Plank', kind: 'timed', videoUrl: 'https://example.com/videos/mine' } })).body.id

    const res = await importPlan({
      date: '2026-11-18',
      sessionType: 'trainer',
      rows: [
        { newExercise: { name: 'Dumbbell bench press', kind: 'weight_reps' }, videoUrl: 'https://example.com/videos/dumbbell-press', sets: [{ weightKg: 12.5, reps: 12 }, { weightKg: 12.5, reps: 12 }] },
        { exerciseId: plank, videoUrl: 'https://example.com/videos/plank', sets: [{ durationS: 45 }] },
      ],
    })
    expect(res.status).toBe(201)
    expect(res.body.status).toBe('draft')
    expect(res.body.exercises.map((e: any) => [e.name, e.videoUrl, e.sets.length])).toEqual([
      ['Dumbbell bench press', 'https://example.com/videos/dumbbell-press', 2],
      ['Plank', 'https://example.com/videos/mine', 1],
    ])

    const listed = (await app.request('/api/workouts', { cookie })).body
    expect(listed).toEqual([{ id: res.body.id, date: '2026-11-18', sessionType: 'trainer', status: 'draft', exerciseCount: 2 }])
  })

  it('rejects a duplicate new name and creates nothing', async () => {
    const before = await exercisesNow()
    const res = await importPlan({
      date: '2026-11-19',
      sessionType: 'trainer',
      rows: [
        { newExercise: { name: 'Dumbbell lunges', kind: 'weight_reps' }, sets: [{ weightKg: 10, reps: 10 }] },
        { newExercise: { name: ' PLANK ', kind: 'timed' }, sets: [{ durationS: 45 }] },
      ],
    })
    expect(res.status).toBe(409)
    expect(res.body.data.fieldErrors).toEqual({ 'rows.1.newExercise.name': 'An exercise with this name already exists' })
    expect(await exercisesNow()).toEqual(before)
    expect((await app.request('/api/workouts', { cookie })).body).toHaveLength(1)
  })

  it('rejects an invalid payload', async () => {
    const res = await importPlan({ date: 'tomorrow', sessionType: 'trainer', rows: [] })
    expect(res.status).toBe(400)
    expect(res.body.data.fieldErrors).toMatchObject({ date: 'Enter a valid date', rows: 'The plan has no exercises' })
  })

  it('requires a session', async () => {
    const res = await importPlan({ date: '2026-11-18', sessionType: 'trainer', rows: [] }, '')
    expect(res.status).toBe(401)
  })
})

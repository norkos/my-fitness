import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { startApp, type TestApp } from './helpers/app'

describe('workouts API', () => {
  let app: TestApp
  let cookie: string
  let bench: number
  let plank: number

  beforeAll(async () => {
    app = await startApp()
    cookie = await app.login()
    bench = (await app.request('/api/exercises', { method: 'POST', cookie, body: { name: 'Bench press', kind: 'weight_reps' } })).body.id
    plank = (await app.request('/api/exercises', { method: 'POST', cookie, body: { name: 'Plank', kind: 'timed' } })).body.id
  })

  afterAll(async () => {
    await app?.stop()
  })

  const create = (body: unknown) => app.request('/api/workouts', { method: 'POST', cookie, body })
  const trainerSession = (date: string, weight = 50) => ({
    date,
    sessionType: 'trainer',
    exercises: [
      { exerciseId: bench, sets: [{ weightKg: weight, reps: 8 }, { weightKg: weight, reps: 8 }] },
      { exerciseId: plank, sets: [{ durationS: 45 }] },
    ],
  })

  it('creates a workout and returns it with all sets in order', async () => {
    const res = await create(trainerSession('2026-11-15'))
    expect(res.status).toBe(201)
    expect(res.body.sessionType).toBe('trainer')
    expect(res.body.exercises.map((e: any) => [e.name, e.sets.length])).toEqual([['Bench press', 2], ['Plank', 1]])
  })

  it('returns field errors for invalid workouts', async () => {
    const res = await create({ date: '2026-11-15', sessionType: 'solo', exercises: [{ exerciseId: bench, sets: [{ reps: 8 }] }] })
    expect(res.status).toBe(400)
    expect(res.body.data.fieldErrors).toEqual({ 'exercises.0.sets.0.weightKg': 'Weight is required' })

    const empty = await create({ date: '2026-11-15', sessionType: 'solo', exercises: [] })
    expect(empty.body.data.fieldErrors).toEqual({ exercises: 'Add at least one exercise' })

    const negative = await create({ date: '2026-11-15', sessionType: 'solo', exercises: [{ exerciseId: plank, sets: [{ durationS: -5 }] }] })
    expect(negative.status).toBe(400)

    expect((await app.request('/api/workouts', { method: 'POST', cookie })).status).toBe(400)
  })

  it('lists workouts newest first with exercise counts', async () => {
    await create(trainerSession('2026-11-01', 45))
    await create({ date: '2026-11-08', sessionType: 'solo', exercises: [{ exerciseId: plank, sets: [{ durationS: 30 }] }] })
    const res = await app.request('/api/workouts', { cookie })
    expect(res.status).toBe(200)
    expect(res.body.map((w: any) => [w.date, w.sessionType, w.exerciseCount])).toEqual([
      ['2026-11-15', 'trainer', 2],
      ['2026-11-08', 'solo', 1],
      ['2026-11-01', 'trainer', 2],
    ])
  })

  it('views, edits and deletes a workout', async () => {
    const created = (await create(trainerSession('2026-11-20', 500))).body

    const view = await app.request(`/api/workouts/${created.id}`, { cookie })
    expect(view.status).toBe(200)
    expect(view.body.exercises[0].sets[0].weightKg).toBe(500)

    const edited = await app.request(`/api/workouts/${created.id}`, {
      method: 'PUT',
      cookie,
      body: { date: '2026-11-20', sessionType: 'solo', exercises: [{ exerciseId: bench, sets: [{ weightKg: 50, reps: 8 }] }] },
    })
    expect(edited.status).toBe(200)
    expect(edited.body.sessionType).toBe('solo')
    expect(edited.body.exercises).toHaveLength(1)
    expect(edited.body.exercises[0].sets).toEqual([{ weightKg: 50, reps: 8, durationS: null, distanceM: null, completed: true }])

    const invalidEdit = await app.request(`/api/workouts/${created.id}`, { method: 'PUT', cookie, body: { date: 'nope', sessionType: 'solo', exercises: [] } })
    expect(invalidEdit.status).toBe(400)

    const del = await app.request(`/api/workouts/${created.id}`, { method: 'DELETE', cookie })
    expect(del.status).toBe(204)
    expect((await app.request(`/api/workouts/${created.id}`, { cookie })).status).toBe(404)
  })

  it('returns 404 for unknown workouts', async () => {
    expect((await app.request('/api/workouts/9999', { cookie })).status).toBe(404)
    expect((await app.request('/api/workouts/x', { cookie })).status).toBe(404)
    expect((await app.request('/api/workouts/9999', { method: 'DELETE', cookie })).status).toBe(404)
    expect((await app.request('/api/workouts/9999', { method: 'PUT', cookie, body: trainerSession('2026-11-15') })).status).toBe(404)
  })

  it('plans a draft, saves gym progress and finishes it', async () => {
    const created = await create({
      date: '2026-11-20',
      sessionType: 'trainer',
      status: 'draft',
      exercises: [
        { exerciseId: bench, sets: [{ weightKg: 12.5, reps: 12 }, { reps: 12 }] },
        { exerciseId: plank, sets: [{ durationS: 45 }] },
      ],
    })
    expect(created.status).toBe(201)
    expect(created.body.status).toBe('draft')
    const id = created.body.id

    const listed = (await app.request('/api/workouts', { cookie })).body.find((w: any) => w.id === id)
    expect(listed.status).toBe('draft')

    const saved = await app.request(`/api/workouts/${id}`, {
      method: 'PUT',
      cookie,
      body: {
        date: '2026-11-20',
        sessionType: 'trainer',
        exercises: [
          { exerciseId: bench, sets: [{ weightKg: 12.5, reps: 10, completed: true }, { reps: 12 }] },
          { exerciseId: plank, sets: [{ durationS: 45 }] },
        ],
      },
    })
    expect(saved.status).toBe(200)
    expect(saved.body.status).toBe('draft')

    const finished = await app.request(`/api/workouts/${id}/finish`, { method: 'POST', cookie })
    expect(finished.status).toBe(200)
    expect(finished.body.status).toBe('done')
    expect(finished.body.exercises.map((e: any) => [e.name, e.sets.map((s: any) => s.reps)])).toEqual([['Bench press', [10]]])

    const again = await app.request(`/api/workouts/${id}/finish`, { method: 'POST', cookie })
    expect(again.status).toBe(409)

    // A gym-mode save arriving after finishing must not turn planned sets into done ones
    const late = await app.request(`/api/workouts/${id}`, {
      method: 'PUT',
      cookie,
      body: {
        date: '2026-11-20',
        sessionType: 'trainer',
        expectedStatus: 'draft',
        exercises: [{ exerciseId: bench, sets: [{ weightKg: 12.5, reps: 10, completed: true }, { weightKg: 12.5, reps: 12 }] }],
      },
    })
    expect(late.status).toBe(409)
    expect(late.body.message).toBe('This workout has already been finished')
    const stored = (await app.request(`/api/workouts/${id}`, { cookie })).body
    expect(stored.exercises[0].sets).toHaveLength(1)
    await app.request(`/api/workouts/${id}`, { method: 'DELETE', cookie })
  })

  it('refuses to finish a draft with nothing done', async () => {
    const id = (await create({ date: '2026-11-21', sessionType: 'solo', status: 'draft', exercises: [{ exerciseId: plank, sets: [{ durationS: 45 }] }] })).body.id
    const res = await app.request(`/api/workouts/${id}/finish`, { method: 'POST', cookie })
    expect(res.status).toBe(400)
    expect(res.body.data.fieldErrors).toEqual({ _: 'Mark at least one set as done before finishing' })
    expect((await app.request(`/api/workouts/9999/finish`, { method: 'POST', cookie })).status).toBe(404)
    await app.request(`/api/workouts/${id}`, { method: 'DELETE', cookie })
  })

  it('marks exercises as used once logged', async () => {
    const list = (await app.request('/api/exercises', { cookie })).body
    expect(list.every((e: any) => e.used)).toBe(true)
  })
})

describe('last-time API', () => {
  let app: TestApp
  let cookie: string
  let bench: number
  let fresh: number

  beforeAll(async () => {
    app = await startApp()
    cookie = await app.login()
    bench = (await app.request('/api/exercises', { method: 'POST', cookie, body: { name: 'Bench press', kind: 'weight_reps' } })).body.id
    fresh = (await app.request('/api/exercises', { method: 'POST', cookie, body: { name: 'Squat', kind: 'weight_reps' } })).body.id
    for (const [date, weight] of [['2026-11-05', 45], ['2026-11-12', 55]] as const) {
      await app.request('/api/workouts', {
        method: 'POST',
        cookie,
        body: { date, sessionType: 'solo', exercises: [{ exerciseId: bench, sets: [{ weightKg: weight, reps: 8 }, { weightKg: weight, reps: 6 }] }] },
      })
    }
  })

  afterAll(async () => {
    await app?.stop()
  })

  it('returns no values for an exercise without history', async () => {
    const res = await app.request(`/api/exercises/${fresh}/last?before=2026-11-15`, { cookie })
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ date: null, sets: [] })
  })

  it('returns sets from the most recent strictly earlier workout', async () => {
    const res = await app.request(`/api/exercises/${bench}/last?before=2026-11-10`, { cookie })
    expect(res.body.date).toBe('2026-11-05')
    expect(res.body.sets.map((s: any) => [s.weightKg, s.reps])).toEqual([[45, 8], [45, 6]])

    const sameDay = await app.request(`/api/exercises/${bench}/last?before=2026-11-12`, { cookie })
    expect(sameDay.body.date).toBe('2026-11-05')

    const latest = await app.request(`/api/exercises/${bench}/last`, { cookie })
    expect(latest.body.date).toBe('2026-11-12')
  })

  it('rejects a bad date and unknown exercises', async () => {
    expect((await app.request(`/api/exercises/${bench}/last?before=yesterday`, { cookie })).status).toBe(400)
    expect((await app.request('/api/exercises/9999/last', { cookie })).status).toBe(404)
  })
})

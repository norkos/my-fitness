import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { startApp, type TestApp } from './helpers/app'

describe('progress API', () => {
  let app: TestApp
  let cookie: string
  let rowing: number
  let pullup: number

  beforeAll(async () => {
    app = await startApp()
    cookie = await app.login()
    rowing = (await app.request('/api/exercises', { method: 'POST', cookie, body: { name: 'Rowing', kind: 'cardio' } })).body.id
    pullup = (await app.request('/api/exercises', { method: 'POST', cookie, body: { name: 'Pull-up', kind: 'bodyweight' } })).body.id
  })

  afterAll(async () => {
    await app?.stop()
  })

  const log = (date: string, exercises: unknown, sessionType = 'solo') =>
    app.request('/api/workouts', { method: 'POST', cookie, body: { date, sessionType, exercises } })

  it('returns an empty history before anything is logged', async () => {
    const res = await app.request(`/api/exercises/${pullup}/progress`, { cookie })
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ exercise: { id: pullup, name: 'Pull-up', kind: 'bodyweight' }, points: [] })
  })

  it('returns a single point for a single workout', async () => {
    await log('2026-11-01', [{ exerciseId: rowing, sets: [{ durationS: 600, distanceM: 2000 }] }])
    const res = await app.request(`/api/exercises/${rowing}/progress`, { cookie })
    expect(res.body.points).toHaveLength(1)
    expect(res.body.points[0].progress).toEqual({ value: 600, distanceM: 2000 })
  })

  it('returns points in date order, updated after edits and deletes', async () => {
    const a = (await log('2026-11-12', [{ exerciseId: pullup, sets: [{ reps: 6 }, { reps: 8 }, { reps: 5 }] }], 'trainer')).body
    await log('2026-11-05', [{ exerciseId: pullup, sets: [{ reps: 50 }] }])
    const b = (await app.request('/api/workouts', { cookie })).body.find((w: any) => w.date === '2026-11-05')

    let res = await app.request(`/api/exercises/${pullup}/progress`, { cookie })
    expect(res.body.points.map((p: any) => [p.date, p.sessionType, p.progress.value])).toEqual([
      ['2026-11-05', 'solo', 50],
      ['2026-11-12', 'trainer', 8],
    ])

    await app.request(`/api/workouts/${b.id}`, {
      method: 'PUT',
      cookie,
      body: { date: '2026-11-05', sessionType: 'solo', exercises: [{ exerciseId: pullup, sets: [{ reps: 5 }] }] },
    })
    res = await app.request(`/api/exercises/${pullup}/progress`, { cookie })
    expect(res.body.points.map((p: any) => p.progress.value)).toEqual([5, 8])

    await app.request(`/api/workouts/${a.id}`, { method: 'DELETE', cookie })
    res = await app.request(`/api/exercises/${pullup}/progress`, { cookie })
    expect(res.body.points.map((p: any) => p.date)).toEqual(['2026-11-05'])
    expect(res.body.points[0].sets).toEqual([{ weightKg: null, reps: 5, durationS: null, distanceM: null }])
  })

  it('returns 404 for an unknown exercise', async () => {
    expect((await app.request('/api/exercises/9999/progress', { cookie })).status).toBe(404)
  })
})

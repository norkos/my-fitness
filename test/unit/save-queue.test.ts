import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createSaveQueue, type SaveStatus } from '../../shared/save-queue'

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

/** A save function whose calls stay pending until the test resolves or rejects them. */
function controlledSave() {
  const calls: Array<{ value: number, resolve: () => void, reject: (e: unknown) => void }> = []
  const save = vi.fn((value: number) => new Promise<void>((resolve, reject) => calls.push({ value, resolve, reject })))
  return { save, calls }
}

function setup(options: { isRetryable?: (e: unknown) => boolean } = {}) {
  const { save, calls } = controlledSave()
  const statuses: SaveStatus[] = []
  const queue = createSaveQueue<number>({ save, debounceMs: 400, retryDelaysMs: [1000, 3000], onStatus: s => statuses.push(s), ...options })
  return { queue, save, calls, statuses }
}

describe('createSaveQueue', () => {
  it('debounces changes and sends only the latest value', async () => {
    const { queue, save, calls } = setup()
    queue.schedule(1)
    queue.schedule(2)
    await vi.advanceTimersByTimeAsync(399)
    expect(save).not.toHaveBeenCalled()
    queue.schedule(3)
    await vi.advanceTimersByTimeAsync(400)
    expect(calls.map(c => c.value)).toEqual([3])
    calls[0]!.resolve()
    await vi.advanceTimersByTimeAsync(0)
    expect(queue.status()).toBe('saved')
    expect(queue.hasUnsaved()).toBe(false)
  })

  it('never runs two saves at once and sends the newest state afterwards', async () => {
    const { queue, calls, statuses } = setup()
    queue.schedule(1)
    await vi.advanceTimersByTimeAsync(400)
    queue.schedule(2)
    queue.schedule(3)
    await vi.advanceTimersByTimeAsync(1000)
    expect(calls.map(c => c.value)).toEqual([1])
    expect(queue.hasUnsaved()).toBe(true)

    calls[0]!.resolve()
    await vi.advanceTimersByTimeAsync(0)
    expect(calls.map(c => c.value)).toEqual([1, 3])
    calls[1]!.resolve()
    await vi.advanceTimersByTimeAsync(0)
    expect(queue.status()).toBe('saved')
    expect(statuses).toEqual(['pending', 'saving', 'saving', 'saved'])
  })

  it('retries a temporary failure with backoff and keeps the change', async () => {
    const { queue, calls } = setup()
    queue.schedule(1)
    await vi.advanceTimersByTimeAsync(400)
    calls[0]!.reject(new Error('offline'))
    await vi.advanceTimersByTimeAsync(0)
    expect(queue.status()).toBe('retrying')
    expect(queue.hasUnsaved()).toBe(true)

    await vi.advanceTimersByTimeAsync(999)
    expect(calls).toHaveLength(1)
    await vi.advanceTimersByTimeAsync(1)
    expect(calls.map(c => c.value)).toEqual([1, 1])
    calls[1]!.reject(new Error('offline'))
    await vi.advanceTimersByTimeAsync(2999)
    expect(calls).toHaveLength(2)
    await vi.advanceTimersByTimeAsync(1)
    calls[2]!.resolve()
    await vi.advanceTimersByTimeAsync(0)
    expect(queue.status()).toBe('saved')
  })

  it('does not retry a rejected change but sends it again with the next change', async () => {
    const { queue, calls } = setup({ isRetryable: e => (e as Error).message !== 'invalid' })
    queue.schedule(1)
    await vi.advanceTimersByTimeAsync(400)
    calls[0]!.reject(new Error('invalid'))
    await vi.advanceTimersByTimeAsync(60_000)
    expect(queue.status()).toBe('rejected')
    expect(calls).toHaveLength(1)

    queue.schedule(2)
    await vi.advanceTimersByTimeAsync(400)
    expect(calls.map(c => c.value)).toEqual([1, 2])
  })

  it('flushes pending changes immediately and waits for an in-flight save', async () => {
    const { queue, calls } = setup()
    queue.schedule(1)
    const flushed = queue.flush()
    await vi.advanceTimersByTimeAsync(0)
    expect(calls.map(c => c.value)).toEqual([1])
    queue.schedule(2)
    calls[0]!.resolve()
    await vi.advanceTimersByTimeAsync(0)
    expect(calls.map(c => c.value)).toEqual([1, 2])
    calls[1]!.resolve()
    await expect(flushed).resolves.toBeUndefined()
    expect(queue.status()).toBe('saved')
  })

  it('flush tries a failing save once more, then rejects', async () => {
    const { queue, calls } = setup()
    queue.schedule(1)
    await vi.advanceTimersByTimeAsync(400)
    calls[0]!.reject(new Error('offline'))
    await vi.advanceTimersByTimeAsync(0)

    const flushed = queue.flush()
    await vi.advanceTimersByTimeAsync(0)
    expect(calls).toHaveLength(2)
    calls[1]!.reject(new Error('still offline'))
    await expect(flushed).rejects.toThrow('still offline')
    expect(queue.hasUnsaved()).toBe(true)
  })

  it('flush resolves at once when everything is saved, and dispose stops pending saves', async () => {
    const { queue, save } = setup()
    await expect(queue.flush()).resolves.toBeUndefined()
    queue.schedule(1)
    queue.dispose()
    await vi.advanceTimersByTimeAsync(1000)
    queue.schedule(2)
    expect(save).not.toHaveBeenCalled()
  })
})

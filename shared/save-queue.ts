/**
 * saved:    everything is stored
 * pending:  a change waits for the debounce
 * saving:   a request is in flight
 * retrying: the last attempt failed for a temporary reason (e.g. no connection) and will be retried
 * rejected: the server refused the change (e.g. validation); it is kept and sent again with the next change
 */
export type SaveStatus = 'saved' | 'pending' | 'saving' | 'retrying' | 'rejected'

export interface SaveQueueOptions<T> {
  save: (value: T) => Promise<void>
  /** Whether a failed save should be retried automatically. Defaults to always. */
  isRetryable?: (error: unknown) => boolean
  onStatus?: (status: SaveStatus, error?: unknown) => void
  debounceMs?: number
  /** Waits between retries; the last value repeats. */
  retryDelaysMs?: readonly number[]
}

export interface SaveQueue<T> {
  /** Records the latest state and saves it after the debounce. Only the newest state is ever sent. */
  schedule: (value: T) => void
  /** Saves the latest state now, resolving once nothing is pending; rejects if it could not be saved. */
  flush: () => Promise<void>
  /** True while a change has not been stored yet. */
  hasUnsaved: () => boolean
  status: () => SaveStatus
  dispose: () => void
}

/**
 * Saves the latest value of something edited continuously (gym mode) with at most one request in flight,
 * so responses can never arrive out of order and overwrite a newer state.
 */
export function createSaveQueue<T>(options: SaveQueueOptions<T>): SaveQueue<T> {
  const debounceMs = options.debounceMs ?? 400
  const retryDelays = options.retryDelaysMs ?? [1000, 2000, 5000, 10000]
  const isRetryable = options.isRetryable ?? (() => true)

  let latest: T | undefined
  let dirty = false
  let inFlight: Promise<void> | undefined
  let timer: ReturnType<typeof setTimeout> | undefined
  let failures = 0
  let current: SaveStatus = 'saved'
  let lastError: unknown
  let disposed = false

  function setStatus(status: SaveStatus, error?: unknown) {
    current = status
    lastError = error
    options.onStatus?.(status, error)
  }

  function startTimer(ms: number) {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      timer = undefined
      void run()
    }, ms)
  }

  async function run(): Promise<void> {
    if (disposed || inFlight || !dirty) return
    const value = latest as T
    dirty = false
    setStatus('saving')
    inFlight = options.save(value)
    try {
      await inFlight
      failures = 0
      inFlight = undefined
      if (dirty) return run()
      setStatus('saved')
    }
    catch (error) {
      inFlight = undefined
      // A newer change replaces the failed value; otherwise the failed value is still unsaved.
      dirty = true
      if (isRetryable(error)) {
        setStatus('retrying', error)
        startTimer(retryDelays[Math.min(failures, retryDelays.length - 1)]!)
        failures++
      }
      else {
        setStatus('rejected', error)
      }
    }
  }

  return {
    schedule(value) {
      if (disposed) return
      latest = value
      dirty = true
      if (!inFlight) setStatus('pending')
      startTimer(debounceMs)
    },
    async flush() {
      if (timer) {
        clearTimeout(timer)
        timer = undefined
      }
      // Try once right away even after earlier failures, but don't loop on a failing save.
      let attempted = false
      for (;;) {
        if (inFlight) {
          // The running save continues with any newer change by itself; wait for it to settle.
          await inFlight.catch(() => {})
          await Promise.resolve()
          continue
        }
        if (!dirty || (attempted && (current === 'retrying' || current === 'rejected'))) break
        attempted = true
        if (timer) {
          clearTimeout(timer)
          timer = undefined
        }
        await run()
      }
      if (dirty || current !== 'saved') throw lastError ?? new Error('Not saved')
    },
    hasUnsaved: () => dirty || inFlight !== undefined,
    status: () => current,
    dispose() {
      disposed = true
      if (timer) clearTimeout(timer)
    },
  }
}

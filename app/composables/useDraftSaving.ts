import { FetchError } from 'ofetch'
import { createSaveQueue, type SaveStatus } from '#shared/save-queue'

/** Save status shown in gym mode; `invalid` means the current values can't be sent until fixed. */
export type DraftSaveStatus = SaveStatus | 'invalid'

/** No response (offline) or a server error is worth retrying; any other refusal is not. */
function isRetryable(error: unknown): boolean {
  if (!(error instanceof FetchError)) return true
  const status = error.response?.status
  return status === undefined || status >= 500 || status === 408 || status === 429
}

/**
 * Saves a draft after every change (see design D6): debounced, one request at a time, retried while offline.
 * While anything is unsaved, leaving the page asks for confirmation.
 */
export function useDraftSaving<T>(save: (value: T) => Promise<unknown>) {
  const status = ref<DraftSaveStatus>('saved')
  /** The server's reason when it refused a save (status `rejected`), e.g. the workout was finished elsewhere. */
  const rejectedReason = ref('')
  const queue = createSaveQueue<T>({
    save: async (value) => {
      await save(value)
    },
    isRetryable,
    onStatus: (s, error) => {
      status.value = s
      rejectedReason.value = s === 'rejected' ? apiErrorMessage(error, '') : ''
    },
  })

  const hasUnsaved = () => queue.hasUnsaved() || status.value === 'invalid'

  function onBeforeUnload(event: BeforeUnloadEvent) {
    if (!hasUnsaved()) return
    event.preventDefault()
    event.returnValue = ''
  }

  onMounted(() => window.addEventListener('beforeunload', onBeforeUnload))
  onBeforeUnmount(() => {
    window.removeEventListener('beforeunload', onBeforeUnload)
    queue.dispose()
  })

  return {
    status: readonly(status),
    rejectedReason: readonly(rejectedReason),
    schedule(value: T) {
      queue.schedule(value)
    },
    /** Marks the current values as not savable (e.g. a non-numeric entry) until the next valid change. */
    markInvalid() {
      status.value = 'invalid'
    },
    flush: () => queue.flush(),
    hasUnsaved,
  }
}

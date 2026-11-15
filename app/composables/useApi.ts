import { FetchError } from 'ofetch'

/** $fetch for the app's API; an expired session sends the user back to the login screen. */
export function useApi() {
  const { clear } = useUserSession()
  return $fetch.create({
    async onResponseError({ response }) {
      if (response.status === 401) {
        await clear().catch(() => {})
        await navigateTo('/login')
      }
    },
  })
}

/** Extracts the server's message from a failed request. */
export function apiErrorMessage(error: unknown, fallback = 'Something went wrong'): string {
  if (error instanceof FetchError) {
    return error.data?.message || error.statusMessage || fallback
  }
  return fallback
}

/** Field errors returned by the API for validation failures (status 400). */
export function apiFieldErrors(error: unknown): Record<string, string> {
  if (error instanceof FetchError && error.data?.data?.fieldErrors) {
    return error.data.data.fieldErrors as Record<string, string>
  }
  return {}
}

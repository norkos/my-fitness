import type { z } from 'zod'

export type FieldErrors = Record<string, string>

/** Flattens zod issues into `{ "path.to.field": "message" }`, keeping the first message per field. */
export function toFieldErrors(error: z.ZodError): FieldErrors {
  const out: FieldErrors = {}
  for (const issue of error.issues) {
    const key = issue.path.length ? issue.path.join('.') : '_'
    if (!(key in out)) out[key] = issue.message
  }
  return out
}

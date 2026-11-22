const POSITIVE_ID = /^[1-9]\d*$/

/**
 * Parses a record id from a route param, query value or API path segment.
 * Accepts only plain positive integers ("42" or 42) within the safe integer range;
 * for an array (a repeated query key) the first item is used. Anything else gives undefined.
 */
export function parsePositiveId(value: unknown): number | undefined {
  const first = Array.isArray(value) ? value[0] : value
  if (typeof first !== 'string' && typeof first !== 'number') return undefined
  const text = String(first)
  if (!POSITIVE_ID.test(text)) return undefined
  const id = Number(text)
  return Number.isSafeInteger(id) ? id : undefined
}

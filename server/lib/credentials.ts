import { createHash, timingSafeEqual } from 'node:crypto'

function digest(value: string): Buffer {
  return createHash('sha256').update(value, 'utf8').digest()
}

/** Compares two strings in constant time with respect to their content and length. */
export function safeEqual(a: string, b: string): boolean {
  return timingSafeEqual(digest(a), digest(b))
}

export function credentialsMatch(
  submitted: { username: string, password: string },
  expected: { username: string, password: string },
): boolean {
  // Evaluate both comparisons so timing does not reveal which part was wrong.
  const userOk = safeEqual(submitted.username, expected.username)
  const passOk = safeEqual(submitted.password, expected.password)
  return userOk && passOk
}

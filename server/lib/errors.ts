import type { z } from 'zod'
import { toFieldErrors, type FieldErrors } from '../../shared/validation'

export type ServiceErrorCode = 'validation' | 'not_found' | 'conflict'

const STATUS: Record<ServiceErrorCode, number> = {
  validation: 400,
  not_found: 404,
  conflict: 409,
}

export class ServiceError extends Error {
  constructor(
    readonly code: ServiceErrorCode,
    message: string,
    readonly fieldErrors: FieldErrors = {},
  ) {
    super(message)
    this.name = 'ServiceError'
  }

  get status(): number {
    return STATUS[this.code]
  }
}

export function validationError(error: z.ZodError, message = 'Please fix the highlighted fields'): ServiceError {
  return new ServiceError('validation', message, toFieldErrors(error))
}

/** Parses input with a zod schema, throwing a validation ServiceError on failure. */
export function parseInput<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input)
  if (!result.success) throw validationError(result.error)
  return result.data
}

/** Parses a positive integer route parameter, treating anything else as not found. */
export function parseId(value: unknown, what = 'Item'): number {
  const id = Number(value)
  if (!Number.isInteger(id) || id <= 0) throw new ServiceError('not_found', `${what} not found`)
  return id
}

import type { EventHandlerRequest, H3Event } from 'h3'
import { ServiceError } from '../lib/errors'

/** Wraps a route handler so service errors become HTTP errors with field details. */
export function defineApiHandler<T>(handler: (event: H3Event<EventHandlerRequest>) => T | Promise<T>) {
  return defineEventHandler(async (event) => {
    try {
      return await handler(event)
    }
    catch (error) {
      if (error instanceof ServiceError) {
        throw createError({
          status: error.status,
          message: error.message,
          data: Object.keys(error.fieldErrors).length ? { fieldErrors: error.fieldErrors } : undefined,
        })
      }
      throw error
    }
  })
}

export async function readJsonBody(event: H3Event): Promise<unknown> {
  return readBody(event).catch(() => undefined)
}

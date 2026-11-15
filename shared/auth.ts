import { z } from 'zod'

export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30

export const loginSchema = z.object({
  username: z.string().trim().min(1, 'Username is required').max(200),
  password: z.string().min(1, 'Password is required').max(500),
})

export type LoginInput = z.infer<typeof loginSchema>

export const INVALID_CREDENTIALS_MESSAGE = 'Invalid username or password'

import { parseTrustedProxyMode, TRUSTED_PROXY_MODES, type TrustedProxyMode } from './client-ip'

export const MIN_SECRET_LENGTH = 32
export const DEFAULT_DATABASE_PATH = './data/fitness.db'

export interface ServerConfig {
  username: string
  password: string
  databasePath: string
  trustedProxy: TrustedProxyMode
}

type Env = Record<string, string | undefined>

/**
 * Returns human-readable problems with the required settings.
 * Messages name the variable only and never include its value.
 */
export function findConfigProblems(env: Env): string[] {
  const problems: string[] = []
  for (const key of ['NUXT_APP_USERNAME', 'NUXT_APP_PASSWORD', 'NUXT_APP_SECRET']) {
    if (!env[key]?.trim()) problems.push(`${key} is not set`)
  }
  const secret = env.NUXT_APP_SECRET?.trim()
  if (secret && secret.length < MIN_SECRET_LENGTH) {
    problems.push(`NUXT_APP_SECRET must be at least ${MIN_SECRET_LENGTH} characters`)
  }
  if (!parseTrustedProxyMode(env.NUXT_TRUSTED_PROXY)) {
    problems.push(`NUXT_TRUSTED_PROXY must be one of: ${TRUSTED_PROXY_MODES.join(', ')}`)
  }
  return problems
}

export function readServerConfig(env: Env): ServerConfig {
  const problems = findConfigProblems(env)
  if (problems.length) {
    throw new Error(`Invalid configuration: ${problems.join('; ')}`)
  }
  return {
    username: env.NUXT_APP_USERNAME!,
    password: env.NUXT_APP_PASSWORD!,
    databasePath: env.NUXT_DATABASE_PATH?.trim() || DEFAULT_DATABASE_PATH,
    trustedProxy: parseTrustedProxyMode(env.NUXT_TRUSTED_PROXY)!,
  }
}

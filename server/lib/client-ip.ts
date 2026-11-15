export const TRUSTED_PROXY_MODES = ['none', 'cloudflare', 'generic'] as const
export type TrustedProxyMode = (typeof TRUSTED_PROXY_MODES)[number]

export interface ClientAddressSources {
  /** Address of the TCP peer that connected to this server. */
  socketAddress?: string | null
  cfConnectingIp?: string | null
  xForwardedFor?: string | null
}

export function parseTrustedProxyMode(value: string | undefined): TrustedProxyMode | undefined {
  const normalized = value?.trim().toLowerCase() || 'none'
  return (TRUSTED_PROXY_MODES as readonly string[]).includes(normalized) ? (normalized as TrustedProxyMode) : undefined
}

/**
 * Identifies the client for login throttling. Forwarding headers can be forged by anyone who
 * reaches the server directly, so they are only used when a matching proxy is configured.
 */
export function resolveClientKey(mode: TrustedProxyMode, sources: ClientAddressSources): string {
  const socket = sources.socketAddress?.trim() || 'unknown'

  if (mode === 'cloudflare') {
    return sources.cfConnectingIp?.trim() || socket
  }

  if (mode === 'generic') {
    // The trusted proxy appends the address it saw; earlier entries are client-controlled.
    const entries = (sources.xForwardedFor ?? '').split(',').map(s => s.trim()).filter(Boolean)
    return entries[entries.length - 1] || socket
  }

  return socket
}

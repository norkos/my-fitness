// Helpers for scripts that start the production build as a throwaway local server.
import { createServer } from 'node:net'

/** Asks the OS for a free port on 127.0.0.1. */
export function freePort() {
  return new Promise((resolve, reject) => {
    const srv = createServer()
    srv.on('error', reject)
    srv.listen(0, '127.0.0.1', () => {
      const { port } = srv.address()
      srv.close(() => resolve(port))
    })
  })
}

/**
 * The server's environment: this process's variables without any inherited `NUXT_*` or `NITRO_*` key,
 * so only the script's own settings configure the app, then the given overrides.
 * System variables such as PATH, SystemRoot and TEMP stay, because Node needs them on Windows.
 */
export function serverEnv(overrides) {
  const env = Object.fromEntries(
    Object.entries(process.env).filter(([key]) => !/^(NUXT|NITRO)_/i.test(key)),
  )
  return { ...env, ...overrides }
}

/**
 * Waits for `${url}/api/health` to answer. Returns false when the spawned server has exited
 * (for example because another process took the port) or after 60 tries, half a second apart.
 */
export async function waitForHealth(url, server) {
  for (let i = 0; i < 60; i++) {
    if (server.exitCode !== null || server.signalCode !== null) return false
    try {
      if ((await fetch(`${url}/api/health`)).ok) return server.exitCode === null
    }
    catch {
      // not up yet
    }
    await new Promise(r => setTimeout(r, 500))
  }
  return false
}

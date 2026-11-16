import { contentSecurityPolicy } from './server/lib/csp'

export default defineNuxtConfig({
  compatibilityDate: '2026-11-01',
  ssr: false,
  devtools: { enabled: false },
  modules: ['@nuxt/ui', 'nuxt-auth-utils', '@nuxt/eslint'],
  css: ['~/assets/css/main.css'],
  runtimeConfig: {
    session: {
      maxAge: 60 * 60 * 24 * 30,
      cookie: {
        // Overridden by NUXT_SESSION_COOKIE_SECURE=false for local HTTP testing only.
        secure: true,
        sameSite: 'lax',
        httpOnly: true,
      },
    },
  },
  app: {
    head: {
      title: 'My Fitness',
      meta: [{ name: 'viewport', content: 'width=device-width, initial-scale=1' }],
    },
  },
  routeRules: {
    '/**': {
      headers: {
        // HTML pages get their inline-script hashes added by server/plugins/csp.ts.
        'Content-Security-Policy': contentSecurityPolicy(),
        // Ignored by browsers over plain HTTP, so local testing is unaffected.
        'Strict-Transport-Security': 'max-age=31536000',
        'X-Frame-Options': 'DENY',
        'X-Content-Type-Options': 'nosniff',
        'Referrer-Policy': 'same-origin',
        'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
      },
    },
  },
  ui: {
    fonts: false,
  },
  icon: {
    // The CSP allows no third-party connections, so every icon must ship in the bundle.
    // The bundle scan misses the layout's nav icons; list them explicitly.
    clientBundle: {
      scan: true,
      icons: ['lucide:list', 'lucide:dumbbell', 'lucide:log-out'],
    },
  },
  eslint: {
    config: { stylistic: false },
  },
  nitro: {
    externals: { external: ['better-sqlite3'] },
  },
})

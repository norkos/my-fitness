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
  ui: {
    fonts: false,
  },
  eslint: {
    config: { stylistic: false },
  },
  nitro: {
    externals: { external: ['better-sqlite3'] },
  },
})

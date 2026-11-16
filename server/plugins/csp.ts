import { contentSecurityPolicy, inlineScriptHashes } from '../lib/csp'

/** Replaces the route-rule CSP on HTML pages with one that allows exactly the page's inline scripts. */
export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('render:response', (response) => {
    if (typeof response.body !== 'string') return
    response.headers = {
      ...response.headers,
      'content-security-policy': contentSecurityPolicy(inlineScriptHashes(response.body)),
    }
  })
})

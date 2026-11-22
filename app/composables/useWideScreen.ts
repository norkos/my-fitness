/** Matches the shell breakpoint (`--breakpoint-nav` in main.css; keep in sync): header nav at or above it, bottom nav below. */
export const NAV_BREAKPOINT_PX = 600

/**
 * Whether the viewport is at least the shell breakpoint wide. Reactive to resizes.
 * The app is a client-only SPA, so the value is correct from the first render.
 */
export function useWideScreen() {
  const query = window.matchMedia(`(min-width: ${NAV_BREAKPOINT_PX}px)`)
  const wide = ref(query.matches)
  const update = () => {
    wide.value = query.matches
  }
  query.addEventListener('change', update)
  onScopeDispose(() => query.removeEventListener('change', update))
  return readonly(wide)
}

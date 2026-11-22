<script setup lang="ts">
const { clear } = useUserSession()
const route = useRoute()
const wide = useWideScreen()

const links = [
  { to: '/', label: 'Workouts', icon: 'i-lucide-list' },
  { to: '/exercises', label: 'Exercises', icon: 'i-lucide-dumbbell' },
]

function isActive(to: string) {
  return to === '/' ? route.path === '/' || route.path.startsWith('/workouts') : route.path.startsWith(to)
}

async function logout() {
  await $fetch('/api/auth/logout', { method: 'POST' }).catch(() => {})
  await clear()
  await navigateTo('/login')
}
</script>

<template>
  <div class="min-h-dvh flex flex-col bg-default">
    <header class="sticky top-0 z-20 border-b border-default bg-white pt-[env(safe-area-inset-top)]">
      <div class="mx-auto max-w-[744px] flex items-center gap-2 px-[21px] nav:px-8 h-16 nav:h-[72px]">
        <NuxtLink to="/" class="mr-auto flex items-center gap-2.5 min-h-11 font-heading text-xl font-extrabold tracking-tight text-highlighted">
          <span class="grid place-items-center size-8 rounded-[10px] bg-primary text-white" aria-hidden="true">
            <UIcon name="i-lucide-dumbbell" class="size-4" />
          </span>
          <span>My Fitness<span class="text-primary">.</span></span>
        </NuxtLink>
        <nav v-if="wide" aria-label="Main" class="flex items-center gap-1">
          <UButton
            v-for="link in links"
            :key="link.to"
            :to="link.to"
            :icon="link.icon"
            :label="link.label"
            :variant="isActive(link.to) ? 'soft' : 'ghost'"
            :color="isActive(link.to) ? 'primary' : 'neutral'"
            :aria-current="isActive(link.to) ? 'page' : undefined"
            :data-testid="`nav-${link.label.toLowerCase()}`"
          />
        </nav>
        <UButton
          icon="i-lucide-log-out"
          variant="ghost"
          color="neutral"
          aria-label="Log out"
          class="min-w-11 justify-center"
          data-testid="logout"
          @click="logout"
        />
      </div>
    </header>

    <main
      class="mx-auto w-full max-w-[744px] flex-1 px-[21px] nav:px-8 py-5 nav:py-8"
      :class="wide ? '' : 'pb-[calc(var(--bottom-nav-height)+20px)]'"
    >
      <slot />
    </main>

    <nav
      v-if="!wide"
      aria-label="Main"
      class="fixed inset-x-0 bottom-0 z-20 border-t border-default bg-white pb-[max(12px,env(safe-area-inset-bottom))] pt-2"
      data-testid="bottom-nav"
    >
      <div class="mx-auto grid max-w-[744px] grid-cols-2 gap-2 px-[21px]">
        <NuxtLink
          v-for="link in links"
          :key="link.to"
          :to="link.to"
          :aria-current="isActive(link.to) ? 'page' : undefined"
          class="flex min-h-11 flex-col items-center justify-center gap-0.5 rounded-md text-xs font-medium"
          :class="isActive(link.to) ? 'bg-primary/10 text-primary' : 'text-muted hover:bg-elevated'"
          :data-testid="`nav-${link.label.toLowerCase()}`"
        >
          <UIcon :name="link.icon" class="size-5" />
          <span>{{ link.label }}</span>
        </NuxtLink>
      </div>
    </nav>
  </div>
</template>

<style>
:root {
  /* Full height of the phone bottom nav (1px border + 8px top + 44px items + bottom padding); sticky action bars sit above it. */
  --bottom-nav-height: calc(53px + max(12px, env(safe-area-inset-bottom)));
}
</style>

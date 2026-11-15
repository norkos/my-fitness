<script setup lang="ts">
const { clear } = useUserSession()
const route = useRoute()

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
    <header class="sticky top-0 z-10 border-b border-default bg-default/95 backdrop-blur">
      <div class="mx-auto max-w-xl flex items-center gap-1 px-3 h-14">
        <NuxtLink to="/" class="font-semibold mr-auto">My Fitness</NuxtLink>
        <UButton
          v-for="link in links"
          :key="link.to"
          :to="link.to"
          :icon="link.icon"
          :variant="isActive(link.to) ? 'soft' : 'ghost'"
          color="neutral"
          size="sm"
          :data-testid="`nav-${link.label.toLowerCase()}`"
        >
          <span class="hidden min-[400px]:inline">{{ link.label }}</span>
        </UButton>
        <UButton
          icon="i-lucide-log-out"
          variant="ghost"
          color="neutral"
          size="sm"
          aria-label="Log out"
          data-testid="logout"
          @click="logout"
        />
      </div>
    </header>
    <main class="mx-auto w-full max-w-xl flex-1 px-3 py-4">
      <slot />
    </main>
  </div>
</template>

<script setup lang="ts">
import type { WorkoutSummary } from '#shared/workouts'

type HomeTab = 'planned' | 'history'

const api = useApi()
const route = useRoute()
const router = useRouter()
const { data: workouts, status } = await useAsyncData('workouts', () => api<WorkoutSummary[]>('/api/workouts'), { default: () => [] })

// The API lists newest first; planned workouts read better soonest first.
const planned = computed(() => workouts.value.filter(w => w.status === 'draft').reverse())
const history = computed(() => workouts.value.filter(w => w.status === 'done'))

// The tab lives in ?tab= so Back from a workout returns to it. Without it: Planned when any plan exists.
const tab = computed<HomeTab>({
  get: () => {
    const q = route.query.tab
    if (q === 'planned' || q === 'history') return q
    return planned.value.length ? 'planned' : 'history'
  },
  set: (value) => {
    router.replace({ query: { ...route.query, tab: value } })
  },
})

const tabs = computed(() => [
  { label: 'Planned', value: 'planned', badge: { label: planned.value.length, color: 'neutral' as const, variant: 'subtle' as const } },
  { label: 'History', value: 'history', badge: { label: history.value.length, color: 'neutral' as const, variant: 'subtle' as const } },
])
</script>

<template>
  <div class="space-y-5" data-testid="home">
    <div class="flex items-center justify-between gap-3">
      <h1 class="text-2xl font-extrabold tracking-tight text-highlighted">Workouts</h1>
      <UButton to="/workouts/new" icon="i-lucide-plus" size="lg" data-testid="new-workout">New workout</UButton>
    </div>

    <div class="grid grid-cols-2 gap-2">
      <UButton to="/workouts/plan" icon="i-lucide-calendar-plus" variant="outline" color="neutral" block class="bg-white" data-testid="new-draft">
        Plan workout
      </UButton>
      <UButton to="/workouts/import" icon="i-lucide-file-up" variant="outline" color="neutral" block class="bg-white" data-testid="import-plan">
        Import plan (PDF)
      </UButton>
    </div>

    <UTabs
      v-model="tab"
      :items="tabs"
      :content="false"
      variant="link"
      class="w-full"
      :ui="{ trigger: 'min-h-11 flex-1', label: 'text-base' }"
      data-testid="home-tabs"
    />

    <template v-if="status !== 'pending'">
      <section v-if="tab === 'planned'" aria-label="Planned workouts">
        <ul v-if="planned.length" class="space-y-3" data-testid="planned">
          <WorkoutCard v-for="workout in planned" :key="workout.id" :workout="workout" variant="planned" />
        </ul>
        <div v-else class="rounded-[10px] border border-dashed border-default p-8 text-center space-y-3" data-testid="planned-empty">
          <p class="text-muted">No planned workouts. Plan one ahead or import your trainer's plan.</p>
          <div class="flex flex-wrap justify-center gap-2">
            <UButton to="/workouts/plan" icon="i-lucide-calendar-plus">Plan workout</UButton>
            <UButton to="/workouts/import" icon="i-lucide-file-up" variant="outline" color="neutral">Import plan</UButton>
          </div>
        </div>
      </section>

      <section v-else aria-label="Workout history">
        <ul
          v-if="history.length"
          class="divide-y divide-default overflow-hidden rounded-[10px] border border-default bg-white"
          data-testid="workout-list"
        >
          <WorkoutCard v-for="workout in history" :key="workout.id" :workout="workout" variant="history" />
        </ul>
        <div v-else class="rounded-[10px] border border-dashed border-default p-8 text-center space-y-3" data-testid="workouts-empty">
          <p class="text-muted">No workouts yet. Completed workouts will appear here.</p>
          <UButton to="/workouts/new" icon="i-lucide-plus">Log your first workout</UButton>
        </div>
      </section>
    </template>
  </div>
</template>

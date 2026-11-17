<script setup lang="ts">
import { formatDate } from '#shared/format'
import type { WorkoutSummary } from '#shared/workouts'

const api = useApi()
const { data: workouts, status } = await useAsyncData('workouts', () => api<WorkoutSummary[]>('/api/workouts'), { default: () => [] })

// The API lists newest first; planned workouts read better soonest first.
const planned = computed(() => workouts.value.filter(w => w.status === 'draft').reverse())
const history = computed(() => workouts.value.filter(w => w.status === 'done'))

const exerciseCount = (n: number) => `${n} ${n === 1 ? 'exercise' : 'exercises'}`
</script>

<template>
  <div class="space-y-4" data-testid="home">
    <div class="flex items-center justify-between gap-2">
      <h1 class="text-xl font-semibold">Workouts</h1>
      <UButton to="/workouts/new" icon="i-lucide-plus" size="lg" data-testid="new-workout">New workout</UButton>
    </div>

    <div class="grid grid-cols-2 gap-2">
      <UButton to="/workouts/plan" icon="i-lucide-calendar-plus" variant="outline" color="neutral" block data-testid="new-draft">
        Plan workout
      </UButton>
      <UButton to="/workouts/import" icon="i-lucide-file-up" variant="outline" color="neutral" block data-testid="import-plan">
        Import plan
      </UButton>
    </div>

    <section v-if="planned.length" class="space-y-2" data-testid="planned">
      <h2 class="font-medium">Planned</h2>
      <ul class="divide-y divide-default rounded-lg border border-primary/40 bg-primary/5">
        <li v-for="workout in planned" :key="workout.id" data-testid="planned-item">
          <NuxtLink :to="`/workouts/${workout.id}/edit`" class="flex items-center gap-3 px-3 py-3 active:bg-elevated">
            <div class="flex-1 min-w-0">
              <div class="font-medium" data-testid="planned-item-date">{{ formatDate(workout.date) }}</div>
              <div class="text-sm text-muted">{{ exerciseCount(workout.exerciseCount) }}</div>
            </div>
            <SessionBadge :type="workout.sessionType" />
            <UIcon name="i-lucide-chevron-right" class="text-muted" />
          </NuxtLink>
        </li>
      </ul>
    </section>

    <section class="space-y-2">
      <h2 v-if="planned.length" class="font-medium">History</h2>
      <div
        v-if="status !== 'pending' && !history.length"
        class="rounded-lg border border-dashed border-default p-8 text-center space-y-3"
        data-testid="workouts-empty"
      >
        <p class="text-muted">No workouts yet.</p>
        <UButton to="/workouts/new" icon="i-lucide-plus">Log your first workout</UButton>
      </div>

      <ul v-else class="divide-y divide-default rounded-lg border border-default" data-testid="workout-list">
        <li v-for="workout in history" :key="workout.id" data-testid="workout-item">
          <NuxtLink :to="`/workouts/${workout.id}`" class="flex items-center gap-3 px-3 py-3 active:bg-elevated">
            <div class="flex-1 min-w-0">
              <div class="font-medium" data-testid="workout-item-date">{{ formatDate(workout.date) }}</div>
              <div class="text-sm text-muted" data-testid="workout-item-count">{{ exerciseCount(workout.exerciseCount) }}</div>
            </div>
            <SessionBadge :type="workout.sessionType" />
            <UIcon name="i-lucide-chevron-right" class="text-muted" />
          </NuxtLink>
        </li>
      </ul>
    </section>
  </div>
</template>

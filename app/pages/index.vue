<script setup lang="ts">
import { formatDate } from '#shared/format'
import type { WorkoutSummary } from '#shared/workouts'

const api = useApi()
const { data: workouts, status } = await useAsyncData('workouts', () => api<WorkoutSummary[]>('/api/workouts'), { default: () => [] })
</script>

<template>
  <div class="space-y-4" data-testid="home">
    <div class="flex items-center justify-between gap-2">
      <h1 class="text-xl font-semibold">Workouts</h1>
      <UButton to="/workouts/new" icon="i-lucide-plus" size="lg" data-testid="new-workout">New workout</UButton>
    </div>

    <div
      v-if="status !== 'pending' && !workouts.length"
      class="rounded-lg border border-dashed border-default p-8 text-center space-y-3"
      data-testid="workouts-empty"
    >
      <p class="text-muted">No workouts yet.</p>
      <UButton to="/workouts/new" icon="i-lucide-plus">Log your first workout</UButton>
    </div>

    <ul v-else class="divide-y divide-default rounded-lg border border-default" data-testid="workout-list">
      <li v-for="workout in workouts" :key="workout.id" data-testid="workout-item">
        <NuxtLink :to="`/workouts/${workout.id}`" class="flex items-center gap-3 px-3 py-3 active:bg-elevated">
          <div class="flex-1 min-w-0">
            <div class="font-medium" data-testid="workout-item-date">{{ formatDate(workout.date) }}</div>
            <div class="text-sm text-muted" data-testid="workout-item-count">
              {{ workout.exerciseCount }} {{ workout.exerciseCount === 1 ? 'exercise' : 'exercises' }}
            </div>
          </div>
          <SessionBadge :type="workout.sessionType" />
          <UIcon name="i-lucide-chevron-right" class="text-muted" />
        </NuxtLink>
      </li>
    </ul>
  </div>
</template>

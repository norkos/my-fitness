<script setup lang="ts">
import { formatDate, formatSet } from '#shared/format'
import { formatProgress, type ExerciseProgress } from '#shared/progress'

const route = useRoute()
const api = useApi()

const { data, error } = await useAsyncData(`progress-${route.params.id}`, () => api<ExerciseProgress>(`/api/exercises/${route.params.id}/progress`))

const newestFirst = computed(() => [...(data.value?.points ?? [])].reverse())
const latest = computed(() => newestFirst.value[0])
</script>

<template>
  <div class="space-y-4" data-testid="exercise-progress">
    <UButton to="/exercises" icon="i-lucide-arrow-left" variant="ghost" color="neutral" size="sm">Exercises</UButton>

    <UAlert v-if="error" color="error" variant="soft" title="Exercise not found" />

    <template v-else-if="data">
      <div class="flex items-center gap-2">
        <h1 class="text-xl font-semibold truncate" data-testid="progress-title">{{ data.exercise.name }}</h1>
        <KindBadge :kind="data.exercise.kind" />
      </div>

      <div
        v-if="!data.points.length"
        class="rounded-lg border border-dashed border-default p-8 text-center text-muted"
        data-testid="progress-empty"
      >
        No history yet. Log a workout with this exercise to see progress.
      </div>

      <template v-else>
        <UCard :ui="{ body: 'p-3 sm:p-4' }">
          <div class="text-sm text-muted">Latest</div>
          <div class="text-2xl font-semibold" data-testid="progress-latest">{{ formatProgress(data.exercise.kind, latest!.progress) }}</div>
          <ProgressChart v-if="data.points.length > 1" class="mt-3" :kind="data.exercise.kind" :points="data.points" />
          <p v-else class="mt-2 text-sm text-muted" data-testid="progress-single">Log it again to see a trend.</p>
        </UCard>

        <h2 class="font-medium">History</h2>
        <ul class="space-y-2" data-testid="progress-history">
          <li v-for="point in newestFirst" :key="point.workoutId" data-testid="progress-history-item">
            <NuxtLink :to="`/workouts/${point.workoutId}`" class="block rounded-lg border border-default p-3 active:bg-elevated">
              <div class="flex items-center gap-2">
                <span class="font-medium flex-1">{{ formatDate(point.date) }}</span>
                <SessionBadge :type="point.sessionType" />
              </div>
              <div class="mt-1 text-sm text-muted">
                {{ point.sets.map(s => formatSet(data!.exercise.kind, s)).join(', ') }}
              </div>
            </NuxtLink>
          </li>
        </ul>
      </template>
    </template>
  </div>
</template>

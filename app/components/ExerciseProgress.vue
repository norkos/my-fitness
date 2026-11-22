<script setup lang="ts">
import { formatDate, formatSet } from '#shared/format'
import { formatProgress, type ExerciseProgress as ProgressData } from '#shared/progress'

/**
 * An exercise's progress: latest value, chart and newest-first history.
 * Rendered by the progress page and, inside a sheet, by the workout editor and gym mode.
 */
const props = withDefaults(defineProps<{
  exerciseId: number | string
  /** Show the name and kind as a heading (the sheet shows them in its own title instead). */
  showTitle?: boolean
  /** Link history rows to their workouts. Off inside the editors, where leaving would drop unsaved input. */
  linkHistory?: boolean
}>(), { showTitle: true, linkHistory: true })

const api = useApi()

// Not awaited: inside a sheet this component mounts after the page's Suspense has resolved.
const { data, error } = useAsyncData(
  `progress-${props.exerciseId}`,
  () => api<ProgressData>(`/api/exercises/${props.exerciseId}/progress`),
)

const NuxtLink = resolveComponent('NuxtLink')
const newestFirst = computed(() => [...(data.value?.points ?? [])].reverse())
const latest = computed(() => newestFirst.value[0])
</script>

<template>
  <div class="space-y-4" data-testid="exercise-progress">
    <UAlert v-if="error" color="error" variant="soft" title="Exercise not found" />

    <div v-else-if="!data" class="py-8 text-center text-muted" data-testid="progress-loading">
      Loading...
    </div>

    <template v-else>
      <div v-if="showTitle" class="flex items-center gap-2">
        <h1 class="text-2xl font-extrabold tracking-tight text-highlighted truncate" data-testid="progress-title">{{ data.exercise.name }}</h1>
        <KindBadge :kind="data.exercise.kind" />
      </div>

      <div
        v-if="!data.points.length"
        class="rounded-[10px] border border-dashed border-default p-8 text-center text-muted"
        data-testid="progress-empty"
      >
        No history yet. Log a workout with this exercise to see progress.
      </div>

      <template v-else>
        <UCard :ui="{ body: 'p-4' }">
          <div class="text-sm text-muted">Latest</div>
          <div class="font-heading text-2xl font-bold text-highlighted" data-testid="progress-latest">{{ formatProgress(data.exercise.kind, latest!.progress) }}</div>
          <ProgressChart v-if="data.points.length > 1" class="mt-3" :kind="data.exercise.kind" :points="data.points" />
          <p v-else class="mt-2 text-sm text-muted" data-testid="progress-single">Log it again to see a trend.</p>
        </UCard>

        <h2 class="font-bold text-highlighted">History</h2>
        <ul class="space-y-2" data-testid="progress-history">
          <li v-for="point in newestFirst" :key="point.workoutId" data-testid="progress-history-item">
            <component
              :is="linkHistory ? NuxtLink : 'div'"
              :to="linkHistory ? `/workouts/${point.workoutId}` : undefined"
              class="block min-h-11 rounded-[10px] border border-default bg-white p-3"
              :class="linkHistory ? 'hover:bg-elevated/50 active:bg-elevated' : ''"
            >
              <div class="flex items-center gap-2">
                <span class="font-medium flex-1">{{ formatDate(point.date) }}</span>
                <SessionBadge :type="point.sessionType" />
              </div>
              <div class="mt-1 text-sm text-muted">
                {{ point.sets.map(s => formatSet(data!.exercise.kind, s)).join(', ') }}
              </div>
            </component>
          </li>
        </ul>
      </template>
    </template>
  </div>
</template>

<script setup lang="ts">
import { parsePositiveId } from '#shared/ids'
import type { WorkoutDetail } from '#shared/workouts'

// Remount on a query change, so moving between `?from=` addresses loads the new source.
definePageMeta({ key: route => route.fullPath })

const route = useRoute()
const api = useApi()

// `?from=<id>` repeats a done workout: its exercises and achieved values pre-fill the new plan.
// A malformed id is treated like a missing workout, without a request.
const hasFrom = route.query.from !== undefined
const fromId = parsePositiveId(route.query.from)
const { data: loaded } = fromId !== undefined
  ? await useAsyncData(`workout-repeat-${fromId}`, () => api<WorkoutDetail>(`/api/workouts/${fromId}`).catch(() => null))
  : { data: ref<WorkoutDetail | null>(null) }
const source = computed(() => (loaded.value?.status === 'done' ? loaded.value : undefined))
const sourceMissing = computed(() => hasFrom && !source.value)
</script>

<template>
  <div class="space-y-4">
    <UButton to="/" icon="i-lucide-arrow-left" variant="ghost" color="neutral" size="sm">Workouts</UButton>
    <h1 class="text-xl font-semibold">Plan a workout</h1>
    <p class="text-sm text-muted">Planned values are a starting point; you adjust them in the gym.</p>
    <UAlert
      v-if="sourceMissing"
      color="warning"
      variant="soft"
      title="Workout to repeat could not be loaded"
      description="Start from an empty plan instead."
      data-testid="repeat-missing"
    />
    <WorkoutForm :key="source?.id ?? 'empty'" draft :source="source" />
  </div>
</template>

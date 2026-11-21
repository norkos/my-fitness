<script setup lang="ts">
import type { WorkoutDetail } from '#shared/workouts'

// Remount on a query change, so moving between `?from=` addresses loads the new source.
definePageMeta({ key: route => route.fullPath })

const route = useRoute()
const api = useApi()

// `?from=<id>` repeats a done workout: its exercises and achieved values pre-fill the new plan.
const rawFrom = route.query.from
const fromId = rawFrom === undefined ? undefined : String((Array.isArray(rawFrom) ? rawFrom[0] : rawFrom) ?? '')
const { data: loaded } = fromId
  ? await useAsyncData(`workout-repeat-${fromId}`, () => api<WorkoutDetail>(`/api/workouts/${encodeURIComponent(fromId)}`).catch(() => null))
  : { data: ref<WorkoutDetail | null>(null) }
const source = computed(() => (loaded.value?.status === 'done' ? loaded.value : undefined))
const sourceMissing = computed(() => fromId !== undefined && !source.value)
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

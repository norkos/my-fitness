<script setup lang="ts">
import { formatDate, formatSets } from '#shared/format'
import type { ExerciseKind } from '#shared/kinds'
import type { LastTime } from '#shared/workouts'

/** Gym mode: the exercise's values from its previous done workout, in a tinted box. Hidden while loading. */
defineProps<{
  kind: ExerciseKind
  /** Undefined while loading (or when loading failed). */
  last: LastTime | undefined
}>()
</script>

<template>
  <div
    v-if="last"
    class="flex items-start gap-2 rounded-md bg-last-time-bg px-3 py-2 text-xs text-last-time-text"
    data-testid="gym-entry-last"
  >
    <UIcon name="i-lucide-clock" class="mt-px size-3.5 shrink-0" aria-hidden="true" />
    <span v-if="last.date">Last time ({{ formatDate(last.date) }}): {{ formatSets(kind, last.sets) }}</span>
    <span v-else>No previous record</span>
  </div>
</template>

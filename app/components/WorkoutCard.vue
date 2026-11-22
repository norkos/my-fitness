<script setup lang="ts">
import { formatDate } from '#shared/format'
import type { WorkoutSummary } from '#shared/workouts'

const props = defineProps<{
  workout: WorkoutSummary
  /** `planned`: a card with an exercise preview and Edit plan / Start in gym. `history`: a row opening the workout. */
  variant: 'planned' | 'history'
}>()

const PREVIEW_COUNT = 3

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`
const meta = computed(() =>
  `${plural(props.workout.exerciseCount, 'exercise', 'exercises')} · ${plural(props.workout.setCount, 'set', 'sets')}`)
const preview = computed(() => props.workout.exerciseNames.slice(0, PREVIEW_COUNT))
const more = computed(() => Math.max(0, props.workout.exerciseNames.length - PREVIEW_COUNT))
const testid = computed(() => (props.variant === 'planned' ? 'planned-item' : 'workout-item'))
</script>

<template>
  <li
    v-if="variant === 'planned'"
    class="rounded-[10px] border border-default bg-white p-4 space-y-3"
    :data-testid="testid"
  >
    <div class="flex items-center gap-3">
      <span class="grid size-11 shrink-0 place-items-center rounded-md bg-primary/10 text-primary" aria-hidden="true">
        <UIcon name="i-lucide-calendar" class="size-5" />
      </span>
      <div class="min-w-0 flex-1">
        <div class="font-heading font-bold text-highlighted" :data-testid="`${testid}-date`">{{ formatDate(workout.date) }}</div>
        <div class="text-sm text-muted" :data-testid="`${testid}-count`">{{ meta }}</div>
      </div>
      <SessionBadge :type="workout.sessionType" />
    </div>

    <ul v-if="preview.length" class="flex flex-wrap gap-1.5" :data-testid="`${testid}-preview`">
      <li v-for="(name, i) in preview" :key="i" class="max-w-full truncate rounded-md bg-elevated px-2 py-1 text-sm">{{ name }}</li>
      <li v-if="more" class="px-1 py-1 text-sm text-muted" :data-testid="`${testid}-more`">+{{ more }} more</li>
    </ul>

    <div class="grid grid-cols-2 gap-2">
      <UButton
        :to="`/workouts/${workout.id}/edit`"
        icon="i-lucide-pencil"
        variant="outline"
        color="neutral"
        block
        :aria-label="`Edit plan for ${formatDate(workout.date)}`"
        :data-testid="`${testid}-edit`"
      >
        Edit plan
      </UButton>
      <UButton
        :to="`/workouts/${workout.id}/gym`"
        icon="i-lucide-play"
        block
        :aria-label="`Start in gym: ${formatDate(workout.date)}`"
        :data-testid="`${testid}-gym`"
      >
        Start in gym
      </UButton>
    </div>
  </li>

  <li v-else :data-testid="testid">
    <NuxtLink
      :to="`/workouts/${workout.id}`"
      class="flex min-h-11 items-center gap-3 px-4 py-3 hover:bg-elevated/50 active:bg-elevated"
    >
      <div class="min-w-0 flex-1">
        <div class="font-medium text-highlighted" :data-testid="`${testid}-date`">{{ formatDate(workout.date) }}</div>
        <div class="text-sm text-muted" :data-testid="`${testid}-count`">{{ meta }}</div>
      </div>
      <SessionBadge :type="workout.sessionType" />
      <UIcon name="i-lucide-chevron-right" class="size-5 text-muted" aria-hidden="true" />
    </NuxtLink>
  </li>
</template>

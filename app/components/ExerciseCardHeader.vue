<script setup lang="ts">
import type { ExerciseKind } from '#shared/kinds'

/**
 * Top of an exercise card in the workout editor and gym mode: two-digit number, name, kind, a progress
 * shortcut (opens progress in a sheet over the page) and the video link. The default slot sits under the
 * name, for the last-time values.
 */
const props = defineProps<{
  /** Zero-based position in the workout; shown as 01, 02, ... */
  index: number
  exerciseId: number
  name: string
  kind: ExerciseKind
  videoUrl: string | null
  /** Prefix for test ids, e.g. `entry` gives `entry-name` and `entry-progress`. */
  testidPrefix: string
}>()

const number = computed(() => String(props.index + 1).padStart(2, '0'))
const progressOpen = ref(false)
</script>

<template>
  <div class="flex items-start gap-3">
    <span
      class="grid size-9 shrink-0 place-items-center rounded-md bg-primary/10 font-heading text-sm font-bold text-primary"
      aria-hidden="true"
      :data-testid="`${testidPrefix}-number`"
    >{{ number }}</span>
    <div class="min-w-0 flex-1">
      <div class="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span class="font-heading font-bold text-highlighted break-words" :data-testid="`${testidPrefix}-name`">{{ name }}</span>
        <KindBadge :kind="kind" />
      </div>
      <slot />
    </div>
    <UButton
      icon="i-lucide-chart-line"
      variant="ghost"
      color="neutral"
      class="min-w-11 justify-center"
      :aria-label="`Progress: ${name}`"
      :data-testid="`${testidPrefix}-progress`"
      @click="progressOpen = true"
    />
    <VideoLink :url="videoUrl" :name="name" />
    <ExerciseProgressSheet v-model:open="progressOpen" :exercise-id="exerciseId" :name="name" />
  </div>
</template>

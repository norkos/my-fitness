<script setup lang="ts">
import type { ExerciseKind } from '#shared/kinds'

const props = defineProps<{ kind: ExerciseKind }>()

type KindFamily = 'strength' | 'timed' | 'cardio'

const KIND_ICONS: Record<ExerciseKind, string> = {
  weight_reps: 'i-lucide-dumbbell',
  bodyweight: 'i-lucide-person-standing',
  timed: 'i-lucide-timer',
  cardio: 'i-lucide-heart-pulse',
}

const KIND_FAMILIES: Record<ExerciseKind, KindFamily> = {
  weight_reps: 'strength',
  bodyweight: 'strength',
  timed: 'timed',
  cardio: 'cardio',
}

// Full class names so Tailwind's scanner picks them up; tokens live in app/assets/css/main.css.
const FAMILY_CLASSES: Record<KindFamily, string> = {
  strength: 'bg-tile-strength-bg border-tile-strength-border text-tile-strength-icon',
  timed: 'bg-tile-timed-bg border-tile-timed-border text-tile-timed-icon',
  cardio: 'bg-tile-cardio-bg border-tile-cardio-border text-tile-cardio-icon',
}

const family = computed(() => KIND_FAMILIES[props.kind])
</script>

<template>
  <span
    class="grid size-9 shrink-0 place-items-center rounded-lg border"
    :class="FAMILY_CLASSES[family]"
    aria-hidden="true"
    data-testid="kind-tile"
    :data-kind="kind"
    :data-kind-family="family"
  >
    <UIcon :name="KIND_ICONS[kind]" class="size-5" />
  </span>
</template>

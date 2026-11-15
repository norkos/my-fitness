<script setup lang="ts">
import { EXERCISE_KINDS, KIND_DEFINITIONS, type ExerciseKind } from '#shared/kinds'

const model = defineModel<ExerciseKind | undefined>()
defineProps<{ disabled?: boolean, testidPrefix?: string }>()
</script>

<template>
  <div class="grid grid-cols-2 gap-2" role="radiogroup">
    <UButton
      v-for="kind in EXERCISE_KINDS"
      :key="kind"
      role="radio"
      :aria-checked="model === kind"
      :variant="model === kind ? 'solid' : 'outline'"
      :color="model === kind ? 'primary' : 'neutral'"
      :disabled="disabled"
      block
      size="lg"
      :data-testid="`${testidPrefix ?? 'kind'}-${kind}`"
      @click="model = kind"
    >
      {{ KIND_DEFINITIONS[kind].label }}
    </UButton>
  </div>
</template>

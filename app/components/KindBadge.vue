<script setup lang="ts">
import { KIND_DEFINITIONS, type ExerciseKind } from '#shared/kinds'

defineProps<{ kind: ExerciseKind }>()
</script>

<template>
  <UBadge variant="subtle" color="neutral" :data-testid="`kind-badge-${kind}`">
    {{ KIND_DEFINITIONS[kind].label }}
  </UBadge>
</template>

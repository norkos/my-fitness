<script setup lang="ts">
import { parsePositiveId } from '#shared/ids'

const route = useRoute()
</script>

<template>
  <div class="space-y-4">
    <UButton to="/exercises" icon="i-lucide-arrow-left" variant="ghost" color="neutral" size="sm">Exercises</UButton>
    <ExerciseProgress :key="String(route.params.id)" :exercise-id="parsePositiveId(route.params.id)" />
  </div>
</template>

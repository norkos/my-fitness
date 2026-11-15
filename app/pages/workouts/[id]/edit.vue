<script setup lang="ts">
import type { WorkoutDetail } from '#shared/workouts'

const route = useRoute()
const api = useApi()
const { data: workout, error } = await useAsyncData(`workout-edit-${route.params.id}`, () => api<WorkoutDetail>(`/api/workouts/${route.params.id}`))
</script>

<template>
  <div class="space-y-4">
    <UButton :to="`/workouts/${route.params.id}`" icon="i-lucide-arrow-left" variant="ghost" color="neutral" size="sm">Back</UButton>
    <h1 class="text-xl font-semibold">Edit workout</h1>
    <UAlert v-if="error" color="error" variant="soft" title="Workout not found" />
    <WorkoutForm v-else-if="workout" :initial="workout" />
  </div>
</template>

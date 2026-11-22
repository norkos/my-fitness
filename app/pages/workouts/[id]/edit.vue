<script setup lang="ts">
import { parsePositiveId } from '#shared/ids'
import type { WorkoutDetail } from '#shared/workouts'

const route = useRoute()
const api = useApi()
const id = parsePositiveId(route.params.id)
// A malformed id is shown as not found, without a request.
const { data: workout, error } = await useAsyncData(`workout-edit-${id ?? 'invalid'}`, () => id === undefined
  ? Promise.reject(createError({ statusCode: 404, statusMessage: 'Workout not found' }))
  : api<WorkoutDetail>(`/api/workouts/${id}`))

const planned = computed(() => workout.value?.status === 'draft')
</script>

<template>
  <div class="space-y-4">
    <UButton
      :to="planned || id === undefined ? '/' : `/workouts/${id}`"
      icon="i-lucide-arrow-left"
      variant="ghost"
      color="neutral"
      size="sm"
    >
      {{ planned ? 'Workouts' : 'Back' }}
    </UButton>
    <UAlert v-if="error" color="error" variant="soft" title="Workout not found" />
    <template v-else-if="workout">
      <template v-if="planned">
        <div class="flex items-center gap-2">
          <h1 class="text-xl font-semibold flex-1">Planned workout</h1>
          <UBadge color="primary" variant="soft" data-testid="planned-badge">Planned</UBadge>
        </div>
        <div class="grid grid-cols-2 gap-2">
          <UButton :to="`/workouts/${workout.id}/gym`" icon="i-lucide-play" block size="lg" data-testid="start-gym">Start in gym</UButton>
          <WorkoutDeleteButton :workout-id="workout.id" planned />
        </div>
      </template>
      <h1 v-else class="text-xl font-semibold">Edit workout</h1>
      <WorkoutForm :initial="workout" />
    </template>
  </div>
</template>

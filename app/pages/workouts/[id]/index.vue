<script setup lang="ts">
import { formatDate, formatSet } from '#shared/format'
import { parsePositiveId } from '#shared/ids'
import type { WorkoutDetail } from '#shared/workouts'

const route = useRoute()
const api = useApi()
const id = parsePositiveId(route.params.id)

// A malformed id is shown as not found, without a request.
const { data: workout, error } = await useAsyncData(`workout-${id ?? 'invalid'}`, () => id === undefined
  ? Promise.reject(createError({ statusCode: 404, statusMessage: 'Workout not found' }))
  : api<WorkoutDetail>(`/api/workouts/${id}`))

// A planned workout has no results to show yet; it is viewed and changed in its editor.
if (workout.value?.status === 'draft') {
  await navigateTo(`/workouts/${workout.value.id}/edit`, { replace: true })
}
</script>

<template>
  <div class="space-y-4" data-testid="workout-view">
    <UButton to="/" icon="i-lucide-arrow-left" variant="ghost" color="neutral" size="sm">Workouts</UButton>

    <UAlert v-if="error" color="error" variant="soft" title="Workout not found" />

    <template v-else-if="workout">
      <div class="flex items-center gap-2">
        <h1 class="text-xl font-semibold flex-1" data-testid="workout-view-date">{{ formatDate(workout.date) }}</h1>
        <SessionBadge :type="workout.sessionType" />
      </div>

      <ul class="space-y-3">
        <li v-for="entry in workout.exercises" :key="entry.exerciseId" data-testid="workout-view-entry">
          <UCard :ui="{ body: 'p-3 sm:p-4' }">
            <div class="flex items-center gap-1">
              <NuxtLink :to="`/exercises/${entry.exerciseId}`" class="flex flex-1 min-w-0 items-center gap-2 font-medium" data-testid="workout-view-exercise">
                <span class="truncate">{{ entry.name }}</span>
                <KindBadge :kind="entry.kind" />
                <UIcon name="i-lucide-trending-up" class="ml-auto text-muted" />
              </NuxtLink>
              <VideoLink :url="entry.videoUrl" :name="entry.name" />
            </div>
            <ol class="mt-2 space-y-1 text-sm">
              <li v-for="(set, j) in entry.sets" :key="j" class="flex gap-2" data-testid="workout-view-set">
                <span class="w-5 text-right text-muted">{{ j + 1 }}</span>
                <span>{{ formatSet(entry.kind, set) }}</span>
              </li>
            </ol>
          </UCard>
        </li>
      </ul>

      <UButton :to="`/workouts/plan?from=${workout.id}`" icon="i-lucide-repeat" block size="lg" data-testid="workout-repeat">
        Repeat as draft
      </UButton>
      <div class="grid grid-cols-2 gap-2">
        <UButton :to="`/workouts/${workout.id}/edit`" icon="i-lucide-pencil" variant="outline" color="neutral" block size="lg" data-testid="workout-edit">
          Edit
        </UButton>
        <WorkoutDeleteButton :workout-id="workout.id" />
      </div>
    </template>
  </div>
</template>

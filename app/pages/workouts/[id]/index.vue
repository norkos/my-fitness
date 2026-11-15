<script setup lang="ts">
import { formatDate, formatSet } from '#shared/format'
import type { WorkoutDetail } from '#shared/workouts'

const route = useRoute()
const api = useApi()
const toast = useToast()

const { data: workout, error } = await useAsyncData(`workout-${route.params.id}`, () => api<WorkoutDetail>(`/api/workouts/${route.params.id}`))

const confirmOpen = ref(false)
const deleting = ref(false)

async function remove() {
  deleting.value = true
  try {
    await api(`/api/workouts/${route.params.id}`, { method: 'DELETE' })
    confirmOpen.value = false
    toast.add({ title: 'Workout deleted', color: 'success' })
    await refreshNuxtData('workouts')
    await navigateTo('/', { replace: true })
  }
  catch (e) {
    toast.add({ title: apiErrorMessage(e, 'Could not delete the workout'), color: 'error' })
  }
  finally {
    deleting.value = false
  }
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
            <NuxtLink :to="`/exercises/${entry.exerciseId}`" class="flex items-center gap-2 font-medium" data-testid="workout-view-exercise">
              <span class="truncate">{{ entry.name }}</span>
              <KindBadge :kind="entry.kind" />
              <UIcon name="i-lucide-trending-up" class="ml-auto text-muted" />
            </NuxtLink>
            <ol class="mt-2 space-y-1 text-sm">
              <li v-for="(set, j) in entry.sets" :key="j" class="flex gap-2" data-testid="workout-view-set">
                <span class="w-5 text-right text-muted">{{ j + 1 }}</span>
                <span>{{ formatSet(entry.kind, set) }}</span>
              </li>
            </ol>
          </UCard>
        </li>
      </ul>

      <div class="grid grid-cols-2 gap-2">
        <UButton :to="`/workouts/${workout.id}/edit`" icon="i-lucide-pencil" variant="outline" color="neutral" block size="lg" data-testid="workout-edit">
          Edit
        </UButton>
        <UButton icon="i-lucide-trash-2" variant="outline" color="error" block size="lg" data-testid="workout-delete" @click="confirmOpen = true">
          Delete
        </UButton>
      </div>

      <UModal v-model:open="confirmOpen" title="Delete this workout?" description="All its exercises and sets will be removed." :ui="{ content: 'max-w-sm' }">
        <template #footer>
          <div class="flex w-full gap-2">
            <UButton variant="outline" color="neutral" block data-testid="delete-cancel" @click="confirmOpen = false">Cancel</UButton>
            <UButton color="error" block :loading="deleting" data-testid="delete-confirm" @click="remove">Delete</UButton>
          </div>
        </template>
      </UModal>
    </template>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{ workoutId: number, planned?: boolean }>()

const api = useApi()
const toast = useToast()
const confirmOpen = ref(false)
const deleting = ref(false)

async function remove() {
  deleting.value = true
  try {
    await api(`/api/workouts/${props.workoutId}`, { method: 'DELETE' })
    confirmOpen.value = false
    toast.add({ title: props.planned ? 'Planned workout deleted' : 'Workout deleted', color: 'success' })
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
  <UButton icon="i-lucide-trash-2" variant="outline" color="error" block size="lg" data-testid="workout-delete" @click="confirmOpen = true">
    Delete
  </UButton>
  <AppSheet
    v-model:open="confirmOpen"
    :title="planned ? 'Delete this planned workout?' : 'Delete this workout?'"
    description="All its exercises and sets will be removed."
  >
    <template #footer>
      <div class="flex w-full gap-2">
        <UButton variant="outline" color="neutral" block data-testid="delete-cancel" @click="confirmOpen = false">Cancel</UButton>
        <UButton color="error" block :loading="deleting" data-testid="delete-confirm" @click="remove">Delete</UButton>
      </div>
    </template>
  </AppSheet>
</template>

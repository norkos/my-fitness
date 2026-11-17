<script setup lang="ts">
import type { Exercise } from '#shared/exercises'
import type { ExerciseKind } from '#shared/kinds'

const api = useApi()
const toast = useToast()

const { data: exercises, refresh, status } = await useAsyncData('exercises', () => api<Exercise[]>('/api/exercises'), { default: () => [] })

// Create
const newName = ref('')
const newKind = ref<ExerciseKind>()
const createErrors = ref<Record<string, string>>({})
const creating = ref(false)

async function create() {
  createErrors.value = {}
  if (!newKind.value) {
    createErrors.value = { kind: 'Choose a kind' }
    return
  }
  creating.value = true
  try {
    await api('/api/exercises', { method: 'POST', body: { name: newName.value, kind: newKind.value } })
    toast.add({ title: `Added ${newName.value.trim()}`, color: 'success' })
    newName.value = ''
    newKind.value = undefined
    await refresh()
  }
  catch (e) {
    createErrors.value = apiFieldErrors(e)
    if (!Object.keys(createErrors.value).length) createErrors.value = { name: apiErrorMessage(e) }
  }
  finally {
    creating.value = false
  }
}

// Edit
const editing = ref<Exercise>()
const editOpen = ref(false)
const editName = ref('')
const editKind = ref<ExerciseKind>()
const editVideoUrl = ref('')
const editErrors = ref<Record<string, string>>({})
const saving = ref(false)

function openEdit(exercise: Exercise) {
  editing.value = exercise
  editName.value = exercise.name
  editKind.value = exercise.kind
  editVideoUrl.value = exercise.videoUrl ?? ''
  editErrors.value = {}
  editOpen.value = true
}

async function saveEdit() {
  if (!editing.value) return
  saving.value = true
  editErrors.value = {}
  try {
    const body: Record<string, string> = { name: editName.value, videoUrl: editVideoUrl.value }
    if (editKind.value && editKind.value !== editing.value.kind) body.kind = editKind.value
    await api(`/api/exercises/${editing.value.id}`, { method: 'PATCH', body })
    editOpen.value = false
    await refresh()
  }
  catch (e) {
    editErrors.value = apiFieldErrors(e)
    if (!Object.keys(editErrors.value).length) editErrors.value = { name: apiErrorMessage(e) }
  }
  finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="space-y-6">
    <h1 class="text-xl font-semibold">Exercises</h1>

    <UCard>
      <form class="space-y-3" data-testid="exercise-create-form" @submit.prevent="create">
        <UFormField label="New exercise" name="name" :error="createErrors.name">
          <UInput v-model="newName" placeholder="e.g. Bench press" class="w-full" size="lg" data-testid="exercise-name" />
        </UFormField>
        <UFormField label="Kind" name="kind" :error="createErrors.kind">
          <KindPicker v-model="newKind" />
        </UFormField>
        <UButton type="submit" block size="lg" icon="i-lucide-plus" :loading="creating" data-testid="exercise-create">
          Add exercise
        </UButton>
      </form>
    </UCard>

    <div v-if="status !== 'pending' && !exercises.length" class="text-center text-muted py-6" data-testid="exercises-empty">
      No exercises yet. Add the ones you do above.
    </div>

    <ul v-else class="divide-y divide-default rounded-lg border border-default" data-testid="exercise-list">
      <li v-for="exercise in exercises" :key="exercise.id" class="flex items-center gap-2 px-3 py-2" data-testid="exercise-item">
        <NuxtLink :to="`/exercises/${exercise.id}`" class="flex-1 min-w-0 py-2 flex items-center gap-2" data-testid="exercise-link">
          <span class="truncate font-medium" data-testid="exercise-item-name">{{ exercise.name }}</span>
          <KindBadge :kind="exercise.kind" />
        </NuxtLink>
        <VideoLink :url="exercise.videoUrl" :name="exercise.name" />
        <UButton
          icon="i-lucide-pencil"
          variant="ghost"
          color="neutral"
          :aria-label="`Edit ${exercise.name}`"
          data-testid="exercise-edit"
          @click="openEdit(exercise)"
        />
      </li>
    </ul>

    <UModal v-model:open="editOpen" title="Edit exercise" :ui="{ content: 'max-w-sm' }">
      <template #body>
        <form class="space-y-3" data-testid="exercise-edit-form" @submit.prevent="saveEdit">
          <UFormField label="Name" name="name" :error="editErrors.name">
            <UInput v-model="editName" class="w-full" size="lg" data-testid="exercise-edit-name" />
          </UFormField>
          <UFormField
            label="Kind"
            name="kind"
            :error="editErrors.kind"
            :help="editing?.used ? 'The kind cannot change once the exercise has history.' : undefined"
          >
            <KindPicker v-model="editKind" :disabled="editing?.used" testid-prefix="edit-kind" />
          </UFormField>
          <UFormField label="Video link" name="videoUrl" :error="editErrors.videoUrl" help="Optional, e.g. a YouTube link (https://...)">
            <UInput
              v-model="editVideoUrl"
              type="url"
              inputmode="url"
              placeholder="https://"
              class="w-full"
              size="lg"
              data-testid="exercise-edit-video"
            />
          </UFormField>
          <UButton type="submit" block size="lg" :loading="saving" data-testid="exercise-edit-save">Save</UButton>
        </form>
      </template>
    </UModal>
  </div>
</template>

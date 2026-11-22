<script setup lang="ts">
import type { Exercise } from '#shared/exercises'
import { KIND_DEFINITIONS, type ExerciseKind } from '#shared/kinds'

const api = useApi()
const toast = useToast()

const { data: exercises, refresh, status } = await useAsyncData('exercises', () => api<Exercise[]>('/api/exercises'), { default: () => [] })

const KIND_ICONS: Record<ExerciseKind, string> = {
  weight_reps: 'i-lucide-dumbbell',
  bodyweight: 'i-lucide-person-standing',
  timed: 'i-lucide-timer',
  cardio: 'i-lucide-heart-pulse',
}

// Search: client-side, the catalog is small.
const query = ref('')
const filtered = computed(() => {
  const q = query.value.trim().toLocaleLowerCase()
  return q ? exercises.value.filter(e => e.name.toLocaleLowerCase().includes(q)) : exercises.value
})

// Create
const createOpen = ref(false)
const newName = ref('')
const newKind = ref<ExerciseKind>()
const newVideoUrl = ref('')
const createErrors = ref<Record<string, string>>({})
const creating = ref(false)

function openCreate() {
  newName.value = ''
  newKind.value = undefined
  newVideoUrl.value = ''
  createErrors.value = {}
  createOpen.value = true
}

async function create() {
  if (creating.value) return
  createErrors.value = {}
  if (!newKind.value) {
    createErrors.value = { kind: 'Choose a kind' }
    return
  }
  creating.value = true
  try {
    const body: Record<string, string> = { name: newName.value, kind: newKind.value }
    if (newVideoUrl.value.trim()) body.videoUrl = newVideoUrl.value
    await api('/api/exercises', { method: 'POST', body })
    toast.add({ title: `Added ${newName.value.trim()}`, color: 'success' })
    createOpen.value = false
  }
  catch (e) {
    createErrors.value = apiFieldErrors(e)
    if (!Object.keys(createErrors.value).length) createErrors.value = { name: apiErrorMessage(e) }
    return
  }
  finally {
    creating.value = false
  }
  await refresh()
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
  <div class="space-y-5" data-testid="exercises">
    <PageHeader eyebrow="YOUR EXERCISE LIBRARY" title="Exercises" subtitle="Your movements, last time's numbers, and progress.">
      <UButton icon="i-lucide-plus" size="lg" data-testid="exercise-add" @click="openCreate">Add exercise</UButton>
    </PageHeader>

    <div v-if="status !== 'pending' && !exercises.length" class="rounded-[10px] border border-dashed border-default p-8 text-center space-y-3" data-testid="exercises-empty">
      <p class="text-muted">No exercises yet. Add the ones you do.</p>
      <UButton icon="i-lucide-plus" @click="openCreate">Add exercise</UButton>
    </div>

    <template v-else-if="exercises.length">
      <UInput
        v-model="query"
        icon="i-lucide-search"
        placeholder="Search exercises"
        aria-label="Search exercises"
        class="w-full"
        size="xl"
        :ui="{ base: 'bg-white' }"
        data-testid="exercise-search"
      >
        <template v-if="query" #trailing>
          <UButton
            icon="i-lucide-x"
            variant="link"
            color="neutral"
            class="min-w-11 justify-center"
            aria-label="Clear search"
            data-testid="exercise-search-clear"
            @click="query = ''"
          />
        </template>
      </UInput>

      <div v-if="!filtered.length" class="rounded-[10px] border border-dashed border-default p-8 text-center space-y-3" data-testid="exercises-no-match">
        <p class="text-muted">No exercises match "{{ query.trim() }}".</p>
        <UButton variant="outline" color="neutral" data-testid="exercise-search-reset" @click="query = ''">Clear search</UButton>
      </div>

      <div v-else class="space-y-2">
        <ListCountRow label="YOUR EXERCISES" :count="filtered.length" noun="exercise" count-testid="exercise-count" />
        <ul class="divide-y divide-default overflow-hidden rounded-[10px] border border-default bg-white" data-testid="exercise-list">
          <li v-for="exercise in filtered" :key="exercise.id" class="flex items-center gap-2 py-2 pl-3 pr-1 nav:gap-3 nav:pl-4 nav:pr-2" data-testid="exercise-item">
            <span class="grid size-8 nav:size-10 shrink-0 place-items-center rounded-md bg-primary/10 text-primary" aria-hidden="true">
              <UIcon :name="KIND_ICONS[exercise.kind]" class="size-4 nav:size-5" />
            </span>
            <div class="min-w-0 flex-1">
              <div class="font-semibold text-highlighted break-words" data-testid="exercise-item-name">{{ exercise.name }}</div>
              <div class="text-sm text-muted" :data-testid="`kind-badge-${exercise.kind}`">{{ KIND_DEFINITIONS[exercise.kind].label }}</div>
            </div>
            <VideoLink :url="exercise.videoUrl" :name="exercise.name" />
            <UButton
              :to="`/exercises/${exercise.id}`"
              icon="i-lucide-chart-line"
              variant="ghost"
              color="neutral"
              class="min-w-11 justify-center"
              :aria-label="`Progress: ${exercise.name}`"
              data-testid="exercise-link"
            />
            <UButton
              icon="i-lucide-pencil"
              variant="ghost"
              color="neutral"
              class="min-w-11 justify-center"
              :aria-label="`Edit ${exercise.name}`"
              data-testid="exercise-edit"
              @click="openEdit(exercise)"
            />
          </li>
        </ul>
      </div>
    </template>

    <AppSheet v-model:open="createOpen" title="Add exercise">
      <template #body>
        <form class="space-y-3" data-testid="exercise-create-form" @submit.prevent="create">
          <UFormField label="Name" name="name" :error="createErrors.name">
            <UInput v-model="newName" placeholder="e.g. Bench press" class="w-full" size="lg" autofocus data-testid="exercise-name" />
          </UFormField>
          <UFormField label="Kind" name="kind" :error="createErrors.kind">
            <KindPicker v-model="newKind" />
          </UFormField>
          <UFormField label="Video link" name="videoUrl" :error="createErrors.videoUrl" help="Optional, e.g. a YouTube link (https://...)">
            <UInput
              v-model="newVideoUrl"
              type="url"
              inputmode="url"
              placeholder="https://"
              class="w-full"
              size="lg"
              data-testid="exercise-create-video"
            />
          </UFormField>
          <UButton type="submit" block size="lg" icon="i-lucide-plus" :loading="creating" data-testid="exercise-create">
            Add exercise
          </UButton>
        </form>
      </template>
    </AppSheet>

    <AppSheet v-model:open="editOpen" title="Edit exercise">
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
    </AppSheet>
  </div>
</template>

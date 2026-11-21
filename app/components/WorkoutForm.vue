<script setup lang="ts">
import type { Exercise } from '#shared/exercises'
import { formatDate, formatSets, SESSION_LABELS, toIsoDate, tomorrowIsoDate } from '#shared/format'
import { fieldsForKind, SESSION_TYPES, type SessionType, type WorkoutStatus } from '#shared/kinds'
import { draftToValues, EMPTY_SET_DRAFT, fieldUnit, isFieldRequired, valuesToDraft, type SetDraft } from '#shared/set-form'
import { draftFromWorkout, validateWorkout, type LastTime, type WorkoutDetail } from '#shared/workouts'

/**
 * `initial` edits that workout, whose own status decides the mode. Otherwise a new workout is created:
 * `draft` makes it planned, and `source` (a done workout) pre-fills a new draft dated today.
 */
const props = defineProps<{ initial?: WorkoutDetail, draft?: boolean, source?: WorkoutDetail }>()

const api = useApi()
const toast = useToast()

const mode = computed<WorkoutStatus>(() => props.initial?.status ?? (props.draft || props.source ? 'draft' : 'done'))
const seed = props.initial ?? (props.source ? draftFromWorkout(props.source) : undefined)

/** A set's text fields, plus whether it was ticked in gym mode, which editing keeps. */
type FormSet = SetDraft & { completed?: boolean }

interface EntryDraft {
  key: number
  exerciseId: number
  sets: FormSet[]
  last?: LastTime
}

let nextKey = 0
const date = ref(props.initial?.date ?? (props.draft && !props.source ? tomorrowIsoDate() : toIsoDate(new Date())))
const sessionType = ref<SessionType>(seed?.sessionType ?? 'solo')
const entries = ref<EntryDraft[]>(
  seed?.exercises.map(e => ({
    key: nextKey++,
    exerciseId: e.exerciseId,
    sets: e.sets.map(s => ({ ...valuesToDraft(e.kind, s), completed: s.completed })),
  })) ?? [],
)
const errors = ref<Record<string, string>>({})
const saving = ref(false)
const pickerValue = ref('')

const { data: exercises } = await useAsyncData('exercises', () => api<Exercise[]>('/api/exercises'), { default: () => [] })
const exerciseById = computed(() => new Map(exercises.value.map(e => [e.id, e])))
const available = computed(() => exercises.value.filter(e => !entries.value.some(entry => entry.exerciseId === e.id)))

async function loadLast(entry: EntryDraft) {
  if (!date.value) return
  try {
    entry.last = await api<LastTime>(`/api/exercises/${entry.exerciseId}/last`, { query: { before: date.value } })
  }
  catch {
    entry.last = undefined
  }
}

onMounted(() => entries.value.forEach(loadLast))
watch(date, () => entries.value.forEach(loadLast))

async function addExercise() {
  const id = Number(pickerValue.value)
  pickerValue.value = ''
  const exercise = exerciseById.value.get(id)
  if (!exercise) return
  const entry: EntryDraft = { key: nextKey++, exerciseId: id, sets: [] }
  entries.value.push(entry)
  const added = entries.value[entries.value.length - 1]!
  await loadLast(added)
  added.sets = added.last?.sets.length
    ? added.last.sets.map(s => valuesToDraft(exercise.kind, s))
    : [{ ...EMPTY_SET_DRAFT }]
  delete errors.value.exercises
}

function removeExercise(index: number) {
  entries.value.splice(index, 1)
  errors.value = {}
}

function addSet(entry: EntryDraft) {
  const previous = entry.sets[entry.sets.length - 1]
  entry.sets.push(previous ? { ...previous, completed: false } : { ...EMPTY_SET_DRAFT })
}

function removeSet(entry: EntryDraft, index: number) {
  entry.sets.splice(index, 1)
  errors.value = {}
}

function payload() {
  return {
    date: date.value,
    sessionType: sessionType.value,
    exercises: entries.value.map((entry) => {
      const kind = exerciseById.value.get(entry.exerciseId)?.kind ?? 'weight_reps'
      return {
        exerciseId: entry.exerciseId,
        sets: entry.sets.map(s => ({ ...draftToValues(kind, s), completed: s.completed ?? false })),
      }
    }),
  }
}

const generalErrors = computed(() => {
  const keys = ['date', 'sessionType', 'exercises', '_']
  const messages = keys.filter(k => errors.value[k]).map(k => errors.value[k]!)
  entries.value.forEach((_, i) => {
    for (const k of [`exercises.${i}.sets`, `exercises.${i}.exerciseId`]) {
      if (errors.value[k]) messages.push(errors.value[k]!)
    }
  })
  return messages
})

async function save() {
  const body = payload()
  const result = validateWorkout(body, id => exerciseById.value.get(id)?.kind, { mode: mode.value })
  if (!result.success) {
    errors.value = result.fieldErrors
    return
  }
  errors.value = {}
  saving.value = true
  try {
    const saved = props.initial
      ? await api<WorkoutDetail>(`/api/workouts/${props.initial.id}`, { method: 'PUT', body: { ...result.data, expectedStatus: props.initial.status } })
      : await api<WorkoutDetail>('/api/workouts', { method: 'POST', body: { ...result.data, status: mode.value } })
    toast.add({ title: saved.status === 'draft' ? 'Plan saved' : 'Workout saved', color: 'success' })
    clearNuxtData([`workout-${saved.id}`, `workout-edit-${saved.id}`, `workout-gym-${saved.id}`])
    await refreshNuxtData('workouts')
    await navigateTo(saved.status === 'draft' ? '/' : `/workouts/${saved.id}`, { replace: true })
  }
  catch (e) {
    errors.value = apiFieldErrors(e)
    if (!Object.keys(errors.value).length) errors.value = { _: apiErrorMessage(e) }
  }
  finally {
    saving.value = false
  }
}
</script>

<template>
  <form class="space-y-4" data-testid="workout-form" novalidate @submit.prevent="save">
    <div class="grid grid-cols-1 gap-3">
      <UFormField label="Date" name="date" :error="errors.date">
        <UInput v-model="date" type="date" class="w-full" size="lg" data-testid="workout-date" />
      </UFormField>
      <UFormField label="Session" name="sessionType" :error="errors.sessionType">
        <div class="grid grid-cols-2 gap-2" role="radiogroup">
          <UButton
            v-for="type in SESSION_TYPES"
            :key="type"
            role="radio"
            :aria-checked="sessionType === type"
            :variant="sessionType === type ? 'solid' : 'outline'"
            :color="sessionType === type ? 'primary' : 'neutral'"
            block
            size="lg"
            :data-testid="`session-${type}`"
            @click="sessionType = type"
          >
            {{ SESSION_LABELS[type] }}
          </UButton>
        </div>
      </UFormField>
    </div>

    <UCard
      v-for="(entry, i) in entries"
      :key="entry.key"
      :ui="{ body: 'p-3 sm:p-4' }"
      data-testid="workout-entry"
      :data-exercise="exerciseById.get(entry.exerciseId)?.name"
    >
      <template v-if="exerciseById.get(entry.exerciseId)" #default>
        <div class="flex items-start gap-2 mb-2">
          <div class="flex-1 min-w-0">
            <div class="font-medium truncate" data-testid="entry-name">{{ exerciseById.get(entry.exerciseId)!.name }}</div>
            <div class="text-xs text-muted" data-testid="entry-last">
              <template v-if="entry.last?.date">
                Last time ({{ formatDate(entry.last.date) }}): {{ formatSets(exerciseById.get(entry.exerciseId)!.kind, entry.last.sets) }}
              </template>
              <template v-else-if="entry.last">No previous record</template>
            </div>
          </div>
          <VideoLink :url="exerciseById.get(entry.exerciseId)!.videoUrl" :name="exerciseById.get(entry.exerciseId)!.name" />
          <UButton
            icon="i-lucide-trash-2"
            variant="ghost"
            color="error"
            size="sm"
            :aria-label="`Remove ${exerciseById.get(entry.exerciseId)!.name}`"
            data-testid="entry-remove"
            @click="removeExercise(i)"
          />
        </div>

        <div class="space-y-2">
          <div v-for="(set, j) in entry.sets" :key="j" class="flex items-start gap-2" data-testid="set-row">
            <span class="w-5 pt-2 text-sm text-muted text-right">{{ j + 1 }}</span>
            <div class="flex-1 grid gap-2" :class="fieldsForKind(exerciseById.get(entry.exerciseId)!.kind).length > 1 ? 'grid-cols-2' : 'grid-cols-1'">
              <UFormField
                v-for="field in fieldsForKind(exerciseById.get(entry.exerciseId)!.kind)"
                :key="field"
                :name="`exercises.${i}.sets.${j}.${field}`"
                :error="errors[`exercises.${i}.sets.${j}.${field}`]"
              >
                <UInput
                  v-model="set[field]"
                  :inputmode="field === 'weightKg' || fieldUnit(exerciseById.get(entry.exerciseId)!.kind, field) === 'min' ? 'decimal' : 'numeric'"
                  :placeholder="mode === 'done' && isFieldRequired(exerciseById.get(entry.exerciseId)!.kind, field) ? '' : 'optional'"
                  :aria-label="`Set ${j + 1} ${fieldUnit(exerciseById.get(entry.exerciseId)!.kind, field)}`"
                  class="w-full"
                  size="lg"
                  :data-testid="`set-${field}`"
                  :ui="{ trailing: 'pointer-events-none' }"
                >
                  <template #trailing>
                    <span class="text-xs text-muted">{{ fieldUnit(exerciseById.get(entry.exerciseId)!.kind, field) }}</span>
                  </template>
                </UInput>
              </UFormField>
            </div>
            <UButton
              icon="i-lucide-x"
              variant="ghost"
              color="neutral"
              size="sm"
              class="mt-1"
              :aria-label="`Remove set ${j + 1}`"
              data-testid="set-remove"
              @click="removeSet(entry, j)"
            />
          </div>
        </div>

        <UButton icon="i-lucide-plus" variant="soft" size="sm" class="mt-2" data-testid="set-add" @click="addSet(entry)">
          Add set
        </UButton>
      </template>
    </UCard>

    <div class="space-y-2">
      <label class="text-sm font-medium" for="exercise-picker">Add exercise</label>
      <select
        id="exercise-picker"
        v-model="pickerValue"
        class="w-full rounded-md border border-default bg-default px-3 py-2.5 text-base"
        data-testid="exercise-picker"
        @change="addExercise"
      >
        <option value="" disabled>Choose an exercise...</option>
        <option v-for="exercise in available" :key="exercise.id" :value="String(exercise.id)">{{ exercise.name }}</option>
      </select>
      <p v-if="!exercises.length" class="text-sm text-muted">
        No exercises yet. <NuxtLink to="/exercises" class="text-primary underline">Create some first.</NuxtLink>
      </p>
    </div>

    <UAlert
      v-if="generalErrors.length"
      color="error"
      variant="soft"
      title="Can't save yet"
      :description="generalErrors.join(' ')"
      data-testid="workout-errors"
    />
    <UAlert
      v-else-if="Object.keys(errors).length"
      color="error"
      variant="soft"
      title="Please fix the highlighted fields"
      data-testid="workout-errors"
    />

    <UButton type="submit" block size="xl" :loading="saving" data-testid="workout-save">
      {{ mode === 'draft' ? 'Save plan' : 'Save workout' }}
    </UButton>
  </form>
</template>

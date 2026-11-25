<script setup lang="ts">
import type { Exercise } from '#shared/exercises'
import { formatDate } from '#shared/format'
import { parsePositiveId } from '#shared/ids'
import type { ExerciseKind } from '#shared/kinds'
import { draftToValues, EMPTY_SET_DRAFT, valuesToDraft } from '#shared/set-form'
import { swapSets } from '#shared/swap'
import { validateWorkout, type LastTime, type WorkoutDetail, type WorkoutInput } from '#shared/workouts'
import type { GymSet } from '~/components/GymSetGrid.vue'

const route = useRoute()
const api = useApi()
const toast = useToast()
const id = parsePositiveId(route.params.id)

// A malformed id is shown as not found, without a request. Later calls run only once the workout has loaded.
const { data: workout, error } = await useAsyncData(`workout-gym-${id ?? 'invalid'}`, () => id === undefined
  ? Promise.reject(createError({ statusCode: 404, statusMessage: 'Workout not found' }))
  : api<WorkoutDetail>(`/api/workouts/${id}`))
const { data: exercises, refresh: refreshExercises } = await useAsyncData('exercises', () => api<Exercise[]>('/api/exercises'), { default: () => [] })

interface GymEntry {
  key: number
  exerciseId: number
  name: string
  kind: ExerciseKind
  videoUrl: string | null
  sets: GymSet[]
}

let nextKey = 0
const toGymSets = (kind: ExerciseKind, sets: WorkoutDetail['exercises'][number]['sets']) =>
  sets.map(s => ({ ...valuesToDraft(kind, s), completed: s.completed }))

const entries = ref<GymEntry[]>(
  (workout.value?.exercises ?? []).map(e => ({
    key: nextKey++,
    exerciseId: e.exerciseId,
    name: e.name,
    kind: e.kind,
    videoUrl: e.videoUrl,
    sets: toGymSets(e.kind, e.sets),
  })),
)
// Kept apart from `entries` so loading it does not count as a change to save.
const lastTimes = ref<Record<number, LastTime | undefined>>({})
const errors = ref<Record<string, string>>({})
const finishError = ref('')

async function loadLast(entry: GymEntry) {
  if (!workout.value) return
  try {
    lastTimes.value[entry.key] = await api<LastTime>(`/api/exercises/${entry.exerciseId}/last`, { query: { before: workout.value.date } })
  }
  catch {
    lastTimes.value[entry.key] = undefined
  }
}
onMounted(() => {
  entries.value.forEach(loadLast)
  void refreshExercises()
})

function payload() {
  return {
    date: workout.value!.date,
    sessionType: workout.value!.sessionType,
    exercises: entries.value.map(entry => ({
      exerciseId: entry.exerciseId,
      sets: entry.sets.map(s => ({ ...draftToValues(entry.kind, s), completed: s.completed })),
    })),
  }
}

// expectedStatus: the server refuses the save once the workout has been finished (e.g. in another tab).
const saving = useDraftSaving<WorkoutInput>(body => api<WorkoutDetail>(`/api/workouts/${id}`, { method: 'PUT', body: { ...body, expectedStatus: 'draft' } }))

watch(entries, () => {
  finishError.value = ''
  const result = validateWorkout(payload(), exerciseId => entries.value.find(e => e.exerciseId === exerciseId)?.kind, { mode: 'draft' })
  if (!result.success) {
    errors.value = result.fieldErrors
    saving.markInvalid()
    return
  }
  errors.value = {}
  saving.schedule(result.data)
}, { deep: true })

const STATUS_TEXT = {
  saved: 'Saved',
  pending: 'Saving...',
  saving: 'Saving...',
  retrying: 'Not saved - retrying',
  rejected: 'Not saved',
  invalid: 'Fix the highlighted values to save',
} as const

function addSet(entry: GymEntry) {
  const previous = entry.sets[entry.sets.length - 1]
  entry.sets.push(previous ? { ...previous, completed: false } : { ...EMPTY_SET_DRAFT, completed: false })
}

// Swap
const swapIndex = ref<number>()
const swapOpen = ref(false)
const swapping = computed(() => (swapIndex.value === undefined ? undefined : entries.value[swapIndex.value]))

function openSwap(index: number) {
  swapIndex.value = index
  swapOpen.value = true
}

async function swapTo(exercise: Exercise) {
  const index = swapIndex.value
  const current = index === undefined ? undefined : entries.value[index]
  swapOpen.value = false
  if (!current || index === undefined) return

  let last: LastTime = { date: null, sets: [] }
  if (exercise.kind !== current.kind) {
    last = await api<LastTime>(`/api/exercises/${exercise.id}/last`, { query: { before: workout.value!.date } }).catch(() => last)
  }
  const planned = current.sets.map(s => draftToValues(current.kind, s))
  const entry: GymEntry = {
    key: nextKey++,
    exerciseId: exercise.id,
    name: exercise.name,
    kind: exercise.kind,
    videoUrl: exercise.videoUrl,
    sets: swapSets(current.kind, exercise.kind, planned, last.sets).map(s => ({ ...valuesToDraft(exercise.kind, s), completed: false })),
  }
  entries.value.splice(index, 1, entry)
  toast.add({ title: `Replaced ${current.name} with ${exercise.name}`, color: 'success' })
  await loadLast(entry)
}

// Finish
const finishing = ref(false)
let finished = false
const doneCount = computed(() => entries.value.reduce((n, e) => n + e.sets.filter(s => s.completed).length, 0))

async function finish() {
  finishError.value = ''
  if (saving.status.value === 'invalid') {
    finishError.value = 'Fix the highlighted values first.'
    return
  }
  finishing.value = true
  try {
    await saving.flush()
  }
  catch {
    finishError.value = 'Your latest changes are not saved yet. Check your connection and try again.'
    finishing.value = false
    return
  }
  try {
    await api<WorkoutDetail>(`/api/workouts/${id}/finish`, { method: 'POST' })
    finished = true
    clearNuxtData([`workout-${id}`, `workout-edit-${id}`, `workout-gym-${id}`, 'exercises'])
    await refreshNuxtData('workouts')
    toast.add({ title: 'Workout finished', color: 'success' })
    await navigateTo(`/workouts/${id}`, { replace: true })
  }
  catch (e) {
    const fieldErrors = apiFieldErrors(e)
    errors.value = fieldErrors
    finishError.value = fieldErrors._ ?? (Object.keys(fieldErrors).length ? 'Some done sets are missing values.' : apiErrorMessage(e))
  }
  finally {
    finishing.value = false
  }
}

onBeforeRouteLeave(() => {
  if (finished || !saving.hasUnsaved()) return true
  return window.confirm('Some changes are not saved yet. Leave anyway?')
})
</script>

<template>
  <div class="space-y-4" data-testid="gym-mode">
    <UButton :to="id === undefined ? '/' : `/workouts/${id}/edit`" icon="i-lucide-arrow-left" variant="ghost" color="neutral" size="sm">Plan</UButton>

    <UAlert v-if="error" color="error" variant="soft" title="Workout not found" />
    <UAlert
      v-else-if="workout && workout.status !== 'draft'"
      color="neutral"
      variant="soft"
      title="This workout is already finished"
      data-testid="gym-finished"
    >
      <template #description>
        <NuxtLink :to="`/workouts/${id}`" class="underline">Open the workout</NuxtLink>
      </template>
    </UAlert>

    <template v-else-if="workout">
      <PageHeader eyebrow="FOLLOW YOUR PLAN" title="Gym mode" subtitle="Adjust the numbers. Tick the sets you actually do." />
      <div class="flex items-center gap-2">
        <p class="flex-1 text-lg font-semibold text-highlighted" data-testid="gym-date">{{ formatDate(workout.date) }}</p>
        <SessionBadge :type="workout.sessionType" />
      </div>
      <p
        class="text-sm"
        :class="saving.status.value === 'saved' ? 'text-muted' : saving.status.value === 'pending' || saving.status.value === 'saving' ? 'text-muted' : 'text-error'"
        role="status"
        :data-status="saving.status.value"
        data-testid="save-status"
      >
        {{ STATUS_TEXT[saving.status.value] }}<template v-if="saving.status.value === 'rejected' && saving.rejectedReason.value">: {{ saving.rejectedReason.value }}</template>
      </p>

      <!-- Locked while finishing, so no change can be saved after the draft has become a done workout. -->
      <fieldset :disabled="finishing" class="m-0 min-w-0 border-0 p-0 space-y-4" data-testid="gym-entries">
        <UCard
          v-for="(entry, i) in entries"
          :key="entry.key"
          :ui="{ body: 'p-4' }"
          data-testid="gym-entry"
          :data-exercise="entry.name"
        >
          <ExerciseCardHeader
            :index="i"
            :exercise-id="entry.exerciseId"
            :name="entry.name"
            :kind="entry.kind"
            :video-url="entry.videoUrl"
            testid-prefix="gym-entry"
          />
          <LastTimeBox :kind="entry.kind" :last="lastTimes[entry.key]" class="mt-3" />

          <GymSetGrid v-model:sets="entry.sets" :kind="entry.kind" :entry-index="i" :errors="errors" class="mt-3" />
          <div class="mt-3 flex items-center justify-between gap-2 border-t border-default pt-3">
            <UButton icon="i-lucide-plus" variant="soft" data-testid="gym-set-add" @click="addSet(entry)">
              Add set
            </UButton>
            <UButton
              icon="i-lucide-replace"
              variant="ghost"
              color="neutral"
              :aria-label="`Swap ${entry.name}`"
              data-testid="gym-swap"
              @click="openSwap(i)"
            >
              Swap
            </UButton>
          </div>
        </UCard>
      </fieldset>

      <UAlert v-if="finishError" color="error" variant="soft" :title="finishError" data-testid="gym-finish-error" />

      <!-- On phones Finish sticks above the bottom nav, within thumb reach. -->
      <div
        class="max-nav:sticky max-nav:bottom-(--bottom-nav-height) max-nav:z-10 max-nav:-mx-[21px] max-nav:border-t max-nav:border-default max-nav:bg-default/95 max-nav:px-[21px] max-nav:py-3 max-nav:backdrop-blur"
        data-testid="finish-bar"
      >
        <UButton
          block
          size="xl"
          icon="i-lucide-flag"
          :loading="finishing"
          :disabled="doneCount === 0"
          data-testid="gym-finish"
          @click="finish"
        >
          Finish workout ({{ doneCount }} {{ doneCount === 1 ? 'set' : 'sets' }} done)
        </UButton>
      </div>

      <SwapExerciseModal
        v-model:open="swapOpen"
        :replacing="swapping?.name ?? ''"
        :catalog="exercises"
        :exclude-ids="entries.map(e => e.exerciseId)"
        :confirm-done="swapping?.sets.some(s => s.completed) ?? false"
        @select="swapTo"
      />
    </template>
  </div>
</template>

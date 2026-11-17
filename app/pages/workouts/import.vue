<script setup lang="ts">
import type { Exercise } from '#shared/exercises'
import { formatDuration, formatNumber, SESSION_LABELS, tomorrowIsoDate } from '#shared/format'
import { EXERCISE_KINDS, KIND_DEFINITIONS, SESSION_TYPES, type ExerciseKind, type SessionType } from '#shared/kinds'
import { guessKind, matchExercise, parsePlan, planFitsKind, planSets, type ConfirmedImport, type PlanRow } from '#shared/plan-import'
import type { WorkoutDetail } from '#shared/workouts'

const api = useApi()
const toast = useToast()

const { data: exercises, refresh: refreshExercises } = await useAsyncData('exercises', () => api<Exercise[]>('/api/exercises'), { default: () => [] })
onMounted(() => void refreshExercises())

/** How a planned row maps to the catalog: an existing exercise, or a new one created on confirmation. */
interface ReviewRow {
  plan: PlanRow
  /** True when the name matched a catalog exercise. */
  matched: boolean
  choice: 'existing' | 'new'
  exerciseId: number | undefined
  newKind: ExerciseKind
}

const fileName = ref('')
const reading = ref(false)
const readError = ref('')
const rows = ref<ReviewRow[]>([])
const date = ref(tomorrowIsoDate())
const sessionType = ref<SessionType>('trainer')
const errors = ref<Record<string, string>>({})
const saving = ref(false)

const exerciseById = computed(() => new Map(exercises.value.map(e => [e.id, e])))
const sortedExercises = computed(() => [...exercises.value].sort((a, b) => a.name.localeCompare(b.name)))

function kindOf(row: ReviewRow): ExerciseKind | undefined {
  return row.choice === 'new' ? row.newKind : row.exerciseId !== undefined ? exerciseById.value.get(row.exerciseId)?.kind : undefined
}

function planSummary(plan: PlanRow): string {
  const sets = plan.sets ?? '?'
  if (plan.durationS !== null) return `${sets} x ${formatDuration(plan.durationS)}`
  const reps = plan.reps ?? '?'
  return plan.weightKg !== null ? `${sets} x ${reps} @ ${formatNumber(plan.weightKg)} kg` : `${sets} x ${reps}`
}

async function onFile(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  fileName.value = file.name
  readError.value = ''
  rows.value = []
  errors.value = {}

  const looksLikePdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
  if (!looksLikePdf) {
    readError.value = 'Choose a PDF file.'
    return
  }

  reading.value = true
  try {
    const page = await extractPdfFirstPage(await file.arrayBuffer())
    const result = parsePlan(page)
    if (!result.ok) {
      readError.value = `${result.message}.`
      return
    }
    rows.value = result.rows.map((plan) => {
      const match = matchExercise(plan.name, exercises.value)
      return {
        plan,
        matched: Boolean(match),
        choice: match ? 'existing' : 'new',
        exerciseId: match?.id,
        newKind: guessKind(plan),
      }
    })
  }
  catch (error) {
    readError.value = error instanceof NotAPdfError ? 'This file is not a PDF.' : 'This file could not be read as a training plan.'
  }
  finally {
    reading.value = false
  }
}

function rowError(i: number): string | undefined {
  return errors.value[`rows.${i}.newExercise.name`] ?? errors.value[`rows.${i}.exerciseId`] ?? errors.value[`rows.${i}.newExercise.kind`]
}

const generalError = computed(() => {
  const keys = ['date', 'sessionType', 'rows', '_']
  return keys.map(k => errors.value[k]).find(Boolean)
    ?? Object.entries(errors.value).find(([k]) => /^rows\.\d+\.sets/.test(k))?.[1]
})

const incomplete = computed(() => rows.value.some(r => r.choice === 'existing' && r.exerciseId === undefined))

async function confirm() {
  errors.value = {}
  if (incomplete.value) {
    errors.value = { _: 'Choose an exercise for every row you link to an existing one.' }
    return
  }
  const body: ConfirmedImport = {
    date: date.value,
    sessionType: sessionType.value,
    rows: rows.value.map((row) => {
      const kind = kindOf(row)!
      return {
        ...(row.choice === 'new' ? { newExercise: { name: row.plan.name, kind: row.newKind } } : { exerciseId: row.exerciseId }),
        videoUrl: row.plan.videoUrl,
        sets: planSets(kind, row.plan),
      }
    }),
  }
  saving.value = true
  try {
    const draft = await api<WorkoutDetail>('/api/plan-imports', { method: 'POST', body })
    toast.add({ title: `Plan imported with ${draft.exercises.length} exercises`, color: 'success' })
    clearNuxtData('exercises')
    await refreshNuxtData('workouts')
    await navigateTo(`/workouts/${draft.id}/edit`, { replace: true })
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
  <div class="space-y-4" data-testid="import-page">
    <UButton to="/" icon="i-lucide-arrow-left" variant="ghost" color="neutral" size="sm">Workouts</UButton>
    <h1 class="text-xl font-semibold">Import a plan</h1>
    <p class="text-sm text-muted">Choose the trainer's plan PDF. You can check everything before it is saved.</p>

    <label
      class="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-default p-6 text-center hover:bg-elevated"
      data-testid="import-drop"
    >
      <UIcon name="i-lucide-file-up" class="size-5 text-muted" />
      <span>{{ fileName || 'Choose a PDF' }}</span>
      <input type="file" accept="application/pdf,.pdf" class="sr-only" data-testid="import-file" @change="onFile">
    </label>

    <p v-if="reading" class="text-sm text-muted" data-testid="import-reading">Reading the plan...</p>
    <UAlert v-if="readError" color="error" variant="soft" :title="readError" data-testid="import-error" />

    <form v-if="rows.length" class="space-y-4" data-testid="import-review" novalidate @submit.prevent="confirm">
      <div class="grid grid-cols-1 gap-3">
        <UFormField label="Date" name="date" :error="errors.date">
          <UInput v-model="date" type="date" class="w-full" size="lg" data-testid="import-date" />
        </UFormField>
        <UFormField label="Session" name="sessionType">
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
              :data-testid="`import-session-${type}`"
              @click="sessionType = type"
            >
              {{ SESSION_LABELS[type] }}
            </UButton>
          </div>
        </UFormField>
      </div>

      <h2 class="font-medium">{{ rows.length }} exercises</h2>
      <UCard
        v-for="(row, i) in rows"
        :key="i"
        :ui="{ body: 'p-3 sm:p-4 space-y-2' }"
        data-testid="import-row"
        :data-match="row.matched ? 'matched' : 'new'"
      >
        <div class="flex items-start gap-2">
          <div class="flex-1 min-w-0">
            <div class="font-medium break-words" data-testid="import-row-name">{{ row.plan.name }}</div>
            <div class="text-sm text-muted" data-testid="import-row-plan">{{ planSummary(row.plan) }}</div>
          </div>
          <VideoLink :url="row.plan.videoUrl" :name="row.plan.name" />
          <UBadge v-if="row.matched" color="success" variant="soft" data-testid="import-row-matched">Matched</UBadge>
          <UBadge v-else color="warning" variant="soft" data-testid="import-row-new">New</UBadge>
        </div>

        <ul v-if="row.plan.issues.length" class="text-sm text-warning list-disc pl-5" data-testid="import-row-issues">
          <li v-for="issue in row.plan.issues" :key="issue">{{ issue }}</li>
        </ul>

        <template v-if="!row.matched">
          <div class="grid grid-cols-2 gap-2" role="radiogroup">
            <UButton
              role="radio"
              :aria-checked="row.choice === 'new'"
              :variant="row.choice === 'new' ? 'solid' : 'outline'"
              :color="row.choice === 'new' ? 'primary' : 'neutral'"
              size="sm"
              block
              data-testid="import-row-create"
              @click="row.choice = 'new'"
            >
              Create new
            </UButton>
            <UButton
              role="radio"
              :aria-checked="row.choice === 'existing'"
              :variant="row.choice === 'existing' ? 'solid' : 'outline'"
              :color="row.choice === 'existing' ? 'primary' : 'neutral'"
              size="sm"
              block
              data-testid="import-row-link"
              @click="row.choice = 'existing'"
            >
              Use existing
            </UButton>
          </div>
          <label v-if="row.choice === 'new'" class="block text-sm">
            <span class="text-muted">Kind</span>
            <select v-model="row.newKind" class="mt-1 w-full rounded-md border border-default bg-default px-3 py-2 text-base" data-testid="import-row-kind">
              <option v-for="kind in EXERCISE_KINDS" :key="kind" :value="kind">{{ KIND_DEFINITIONS[kind].label }}</option>
            </select>
          </label>
          <label v-else class="block text-sm">
            <span class="text-muted">Exercise</span>
            <select v-model="row.exerciseId" class="mt-1 w-full rounded-md border border-default bg-default px-3 py-2 text-base" data-testid="import-row-exercise">
              <option :value="undefined" disabled>Choose an exercise...</option>
              <option v-for="exercise in sortedExercises" :key="exercise.id" :value="exercise.id">{{ exercise.name }}</option>
            </select>
          </label>
        </template>

        <p
          v-if="kindOf(row) && !planFitsKind(kindOf(row)!, row.plan)"
          class="text-sm text-warning"
          data-testid="import-row-conflict"
        >
          The planned {{ row.plan.durationS !== null ? 'time' : 'reps' }} don't fit a {{ KIND_DEFINITIONS[kindOf(row)!].label.toLowerCase() }} exercise; those values will be left empty.
        </p>
        <p v-if="rowError(i)" class="text-sm text-error" data-testid="import-row-error">{{ rowError(i) }}</p>
      </UCard>

      <UAlert v-if="generalError" color="error" variant="soft" :title="generalError" data-testid="import-confirm-error" />

      <div class="grid grid-cols-2 gap-2">
        <UButton to="/" variant="outline" color="neutral" block size="lg" data-testid="import-cancel">Cancel</UButton>
        <UButton type="submit" block size="lg" :loading="saving" data-testid="import-confirm">Create plan</UButton>
      </div>
    </form>
  </div>
</template>

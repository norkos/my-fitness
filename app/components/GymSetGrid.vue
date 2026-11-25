<script setup lang="ts">
import { fieldsForKind, type ExerciseKind } from '#shared/kinds'
import { fieldUnit, type SetDraft } from '#shared/set-form'

/** A set in gym mode: its editable values plus whether it was done. */
export type GymSet = SetDraft & { completed: boolean }

/**
 * Gym mode: one exercise's sets as a grid under a header row (SET, one column per value of the kind
 * labelled with its unit, DONE). Each row has the values, a done check and a remove button.
 */
const props = defineProps<{
  kind: ExerciseKind
  /** The exercise's position in the workout, for the `exercises.<i>.sets.<j>.<field>` error keys. */
  entryIndex: number
  /** Validation messages keyed by field path. */
  errors: Record<string, string>
}>()
const sets = defineModel<GymSet[]>('sets', { required: true })

const fields = computed(() => fieldsForKind(props.kind))

// Static class names so Tailwind generates them: set number, one column per value, done, remove.
const GRID_COLUMNS: Record<number, string> = {
  1: 'grid-cols-[1.75rem_repeat(1,minmax(0,1fr))_2.75rem_2.25rem]',
  2: 'grid-cols-[1.75rem_repeat(2,minmax(0,1fr))_2.75rem_2.25rem]',
}
const columns = computed(() => GRID_COLUMNS[fields.value.length])

const errorKey = (j: number, field: string) => `exercises.${props.entryIndex}.sets.${j}.${field}`

function toggleDone(set: GymSet) {
  set.completed = !set.completed
}

function removeSet(index: number) {
  sets.value.splice(index, 1)
}
</script>

<template>
  <div class="space-y-2">
    <div
      class="grid gap-2 text-center text-xs tracking-wider text-muted"
      :class="columns"
      aria-hidden="true"
      data-testid="gym-set-header"
    >
      <span>SET</span>
      <span v-for="field in fields" :key="field">{{ fieldUnit(kind, field).toUpperCase() }}</span>
      <span>DONE</span>
      <span />
    </div>
    <div
      v-for="(set, j) in sets"
      :key="j"
      class="grid items-start gap-2 rounded-md"
      :class="[columns, set.completed ? 'bg-success/10' : '']"
      :data-done="set.completed"
      data-testid="gym-set"
    >
      <span class="flex h-11 items-center justify-center text-xs text-muted" aria-hidden="true">{{ j + 1 }}</span>
      <UFormField
        v-for="field in fields"
        :key="field"
        :name="errorKey(j, field)"
        :error="errors[errorKey(j, field)]"
        class="min-w-0"
      >
        <UInput
          v-model="set[field]"
          :inputmode="field === 'weightKg' || fieldUnit(kind, field) === 'min' ? 'decimal' : 'numeric'"
          :aria-label="`Set ${j + 1} ${fieldUnit(kind, field)}`"
          class="w-full"
          size="lg"
          :ui="{ base: 'h-11 text-center' }"
          :data-testid="`gym-set-${field}`"
        />
      </UFormField>
      <UButton
        icon="i-lucide-check"
        :color="set.completed ? 'primary' : 'neutral'"
        :variant="set.completed ? 'solid' : 'outline'"
        class="size-11 justify-center rounded-md"
        :class="set.completed ? '' : 'bg-transparent'"
        :ui="{ leadingIcon: set.completed ? '' : 'text-muted' }"
        role="checkbox"
        :aria-checked="set.completed"
        :aria-label="`Set ${j + 1} done`"
        data-testid="gym-set-done"
        @click="toggleDone(set)"
      />
      <UButton
        icon="i-lucide-x"
        variant="ghost"
        color="neutral"
        class="h-11 w-9 justify-center"
        :disabled="sets.length === 1"
        :aria-label="`Remove set ${j + 1}`"
        data-testid="gym-set-remove"
        @click="removeSet(j)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Exercise } from '#shared/exercises'
import { formatDate } from '#shared/format'
import { swapCandidates } from '#shared/swap'

const props = defineProps<{
  /** Name of the exercise being replaced; shown in the title. */
  replacing: string
  catalog: Exercise[]
  excludeIds: number[]
  /** Some sets of the replaced exercise are already done, so the swap needs confirmation. */
  confirmDone: boolean
}>()
const emit = defineEmits<{ select: [exercise: Exercise] }>()
const open = defineModel<boolean>('open', { required: true })

const query = ref('')
const chosen = ref<Exercise>()
const candidates = computed(() => swapCandidates(props.catalog, new Set(props.excludeIds), query.value))

watch(open, (isOpen) => {
  if (isOpen) {
    query.value = ''
    chosen.value = undefined
  }
})

function choose(exercise: Exercise) {
  if (props.confirmDone) {
    chosen.value = exercise
    return
  }
  emit('select', exercise)
}
</script>

<template>
  <AppSheet v-model:open="open" :title="`Replace ${replacing}`">
    <template #body>
      <div v-if="chosen" class="space-y-3" data-testid="swap-confirm">
        <p>Some sets of <strong>{{ replacing }}</strong> are already done. Replace it with <strong>{{ chosen.name }}</strong> anyway? The done sets will be replaced.</p>
        <div class="flex gap-2">
          <UButton variant="outline" color="neutral" block data-testid="swap-confirm-cancel" @click="chosen = undefined">Back</UButton>
          <UButton color="warning" block data-testid="swap-confirm-ok" @click="emit('select', chosen)">Replace</UButton>
        </div>
      </div>
      <div v-else class="space-y-3">
        <UInput v-model="query" icon="i-lucide-search" placeholder="Search exercises" class="w-full" size="lg" autofocus data-testid="swap-search" />
        <ul v-if="candidates.length" class="max-h-[50dvh] overflow-y-auto divide-y divide-default rounded-lg border border-default" data-testid="swap-list">
          <li v-for="exercise in candidates" :key="exercise.id">
            <button
              type="button"
              class="flex w-full items-center gap-2 px-3 py-2.5 text-left active:bg-elevated hover:bg-elevated"
              data-testid="swap-option"
              @click="choose(exercise)"
            >
              <span class="flex-1 min-w-0">
                <span class="block truncate font-medium" data-testid="swap-option-name">{{ exercise.name }}</span>
                <span class="block text-xs text-muted">{{ exercise.lastDoneOn ? `Last done ${formatDate(exercise.lastDoneOn)}` : 'Never done' }}</span>
              </span>
              <KindBadge :kind="exercise.kind" />
            </button>
          </li>
        </ul>
        <p v-else class="text-center text-sm text-muted py-4" data-testid="swap-empty">No matching exercises.</p>
      </div>
    </template>
  </AppSheet>
</template>

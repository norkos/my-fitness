<script setup lang="ts">
const props = defineProps<{
  label: string
  count: number
  /** Singular noun, e.g. "workout"; an "s" is added for any count other than one. */
  noun: string
  /** Extra test id for the count text, for screens whose tests already target it. */
  countTestid?: string
}>()

const countText = computed(() => `${props.count} ${props.count === 1 ? props.noun : `${props.noun}s`}`)
</script>

<template>
  <div class="flex items-baseline justify-between gap-3">
    <span class="text-xs font-medium uppercase tracking-[0.13em] text-muted">{{ label }}</span>
    <span class="shrink-0 text-xs text-muted" data-testid="list-count">
      <span v-if="countTestid" :data-testid="countTestid">{{ countText }}</span>
      <template v-else>{{ countText }}</template>
    </span>
  </div>
</template>

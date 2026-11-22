<script setup lang="ts">
defineProps<{
  eyebrow: string
  title: string
  subtitle: string
}>()
</script>

<template>
  <div class="flex items-center justify-between gap-3">
    <div class="min-w-0 flex-1">
      <p class="text-xs font-medium uppercase tracking-[0.13em] text-muted" data-testid="page-eyebrow">{{ eyebrow }}</p>
      <h1 class="mt-1 text-3xl font-bold tracking-tight text-highlighted break-words">
        {{ title }}<span aria-hidden="true" class="text-primary">.</span>
      </h1>
      <p class="mt-1 text-xs text-muted" data-testid="page-subtitle">{{ subtitle }}</p>
    </div>
    <div v-if="$slots.default" class="shrink-0">
      <slot />
    </div>
  </div>
</template>

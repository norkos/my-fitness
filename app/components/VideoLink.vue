<script setup lang="ts">
// compact: 36px wide (still 44px tall) for dense rows such as the Exercises list.
defineProps<{ url: string | null | undefined, name: string, compact?: boolean }>()
</script>

<template>
  <!-- Opens in a new tab so the current page (e.g. gym mode) stays open; rel keeps the video site away from this tab. -->
  <a
    v-if="url"
    :href="url"
    target="_blank"
    rel="noopener noreferrer"
    :class="compact ? 'h-11 w-9' : 'size-11'"
    class="inline-flex shrink-0 items-center justify-center rounded-md text-primary hover:bg-elevated"
    :aria-label="`Watch video: ${name}`"
    :title="`Watch video: ${name}`"
    data-testid="video-link"
    @click.stop
  >
    <UIcon name="i-lucide-circle-play" class="size-5" />
  </a>
</template>

<script setup lang="ts">
defineProps<{ url: string | null | undefined, name: string }>()
</script>

<template>
  <!-- Opens in a new tab so the current page (e.g. gym mode) stays open; rel keeps the video site away from this tab. -->
  <a
    v-if="url"
    :href="url"
    target="_blank"
    rel="noopener noreferrer"
    class="inline-flex size-11 shrink-0 items-center justify-center rounded-md text-primary hover:bg-elevated"
    :aria-label="`Watch video: ${name}`"
    :title="`Watch video: ${name}`"
    data-testid="video-link"
    @click.stop
  >
    <UIcon name="i-lucide-circle-play" class="size-5" />
  </a>
</template>

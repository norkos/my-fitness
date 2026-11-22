<script setup lang="ts">
/** Progress over the workout editor or gym mode, so opening it never leaves the page or drops unsaved input. */
defineProps<{ exerciseId: number, name: string }>()
const open = defineModel<boolean>('open', { required: true })
</script>

<template>
  <AppSheet v-model:open="open" :title="name" description="Progress">
    <template #body>
      <ExerciseProgress :exercise-id="exerciseId" :show-title="false" :link-history="false" />
    </template>
  </AppSheet>
</template>

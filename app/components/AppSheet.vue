<script setup lang="ts">
/**
 * Every dialog in the app goes through this wrapper. Below the shell breakpoint (600px) it is a full-width
 * sheet anchored to the bottom edge with a handle bar; at or above it, a centered dialog up to max-w-md.
 * Focus trapping, Escape and returning focus to the opener come from UModal (Reka dialog).
 * There is deliberately no swipe-to-dismiss, so a half-filled form cannot be closed by accident.
 */
defineProps<{
  title?: string
  description?: string
}>()
const open = defineModel<boolean>('open', { required: true })

const ui = {
  content: [
    'nav:max-w-md',
    // Phone: bottom sheet.
    'max-nav:top-auto max-nav:bottom-0 max-nav:left-0 max-nav:translate-x-0 max-nav:translate-y-0',
    'max-nav:w-full max-nav:max-w-none max-nav:max-h-[90dvh] max-nav:rounded-none max-nav:rounded-t-[20px]',
    'max-nav:pt-3 max-nav:pb-[env(safe-area-inset-bottom)]',
    // Drag-handle bar (decorative).
    'max-nav:before:absolute max-nav:before:top-2 max-nav:before:left-1/2 max-nav:before:-translate-x-1/2',
    'max-nav:before:h-1 max-nav:before:w-10 max-nav:before:rounded-full max-nav:before:bg-accented',
  ].join(' '),
  title: 'font-heading text-lg',
}
</script>

<template>
  <UModal v-model:open="open" :title="title" :description="description" :ui="ui">
    <template v-for="(_, name) in $slots" #[name]="slotProps">
      <slot :name="name" v-bind="slotProps ?? {}" />
    </template>
  </UModal>
</template>

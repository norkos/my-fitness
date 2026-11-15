<script setup lang="ts">
import { SESSION_LABELS } from '#shared/format'
import type { SessionType } from '#shared/kinds'

defineProps<{ type: SessionType }>()
</script>

<template>
  <UBadge :color="type === 'trainer' ? 'primary' : 'neutral'" variant="subtle" data-testid="session-badge">
    {{ SESSION_LABELS[type] }}
  </UBadge>
</template>

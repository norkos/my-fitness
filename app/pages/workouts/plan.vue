<template>
  <div class="space-y-4">
    <UButton to="/" icon="i-lucide-arrow-left" variant="ghost" color="neutral" size="sm">Workouts</UButton>
    <h1 class="text-xl font-semibold">Plan a workout</h1>
    <p class="text-sm text-muted">Planned values are a starting point; you adjust them in the gym.</p>
    <WorkoutForm draft />
  </div>
</template>

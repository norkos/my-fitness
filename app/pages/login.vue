<script setup lang="ts">
definePageMeta({ layout: false })

const { fetch: refreshSession } = useUserSession()

const username = ref('')
const password = ref('')
const error = ref('')
const submitting = ref(false)

async function submit() {
  error.value = ''
  submitting.value = true
  try {
    await $fetch('/api/auth/login', { method: 'POST', body: { username: username.value, password: password.value } })
    await refreshSession()
    await navigateTo('/')
  }
  catch (e) {
    error.value = apiErrorMessage(e, 'Login failed')
  }
  finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="min-h-dvh flex items-center justify-center px-4 bg-default">
    <UCard class="w-full max-w-sm">
      <template #header>
        <h1 class="text-xl font-semibold">My Fitness</h1>
        <p class="text-sm text-muted">Log in to track your workouts</p>
      </template>

      <form class="space-y-4" data-testid="login-form" @submit.prevent="submit">
        <UFormField label="Username" name="username">
          <UInput
            v-model="username"
            autocomplete="username"
            autocapitalize="none"
            class="w-full"
            size="xl"
            data-testid="login-username"
            required
          />
        </UFormField>
        <UFormField label="Password" name="password">
          <UInput
            v-model="password"
            type="password"
            autocomplete="current-password"
            class="w-full"
            size="xl"
            data-testid="login-password"
            required
          />
        </UFormField>

        <UAlert v-if="error" color="error" variant="soft" :title="error" data-testid="login-error" />

        <UButton type="submit" block size="xl" :loading="submitting" data-testid="login-submit">
          Log in
        </UButton>
      </form>
    </UCard>
  </div>
</template>

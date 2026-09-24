<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import axios from 'axios'
import AppButton from '@/components/ui/AppButton.vue'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()

const form = reactive({
  email: '',
  password: '',
})

const errorMessage = ref('')

async function submit(): Promise<void> {
  errorMessage.value = ''

  try {
    await auth.login(form.email, form.password)
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/dashboard'
    await router.replace(redirect)
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const message = error.response?.data?.message
      const emailError = error.response?.data?.errors?.email?.[0]
      errorMessage.value = emailError ?? message ?? 'Unable to sign in. Please try again.'
      return
    }

    errorMessage.value = 'Unable to sign in. Please try again.'
  }
}
</script>

<template>
  <main class="flex min-h-screen bg-lf-canvas">
    <section class="hidden w-[42%] flex-col justify-between bg-lf-forest p-10 text-white lg:flex">
      <div class="flex items-center gap-2.5">
        <span class="flex h-9 w-9 items-center justify-center rounded-lg bg-lf-accent text-sm font-semibold">L</span>
        <p class="text-lg font-semibold">LeadFlow</p>
      </div>
      <div>
        <p class="text-sm font-medium tracking-[0.16em] text-lf-accent">CRM WORKSPACE</p>
        <h1 class="mt-3 max-w-sm text-3xl font-semibold leading-tight">
          Manage leads, pipeline, and customers in one place.
        </h1>
        <p class="mt-4 max-w-sm text-sm text-white/65">
          A focused appointment-business CRM for qualification, conversion, and relationship history.
        </p>
      </div>
      <p class="text-xs text-white/40">Cookie-based session authentication.</p>
    </section>

    <section class="flex flex-1 items-center justify-center px-4 py-12">
      <div class="w-full max-w-md">
        <p class="text-sm font-semibold text-lf-accent lg:hidden">LeadFlow</p>
        <h2 class="mt-2 text-2xl font-semibold text-lf-ink">Sign in</h2>
        <p class="mt-1 text-sm text-lf-muted">Use your workspace account to continue.</p>

        <form class="mt-8 space-y-4" @submit.prevent="submit">
          <div class="lf-field">
            <label for="email" class="lf-label">Email</label>
            <input
              id="email"
              v-model="form.email"
              type="email"
              autocomplete="username"
              required
              class="lf-control"
            >
          </div>
          <div class="lf-field">
            <label for="password" class="lf-label">Password</label>
            <input
              id="password"
              v-model="form.password"
              type="password"
              autocomplete="current-password"
              required
              class="lf-control"
            >
          </div>
          <p v-if="errorMessage" class="text-sm text-lf-danger">{{ errorMessage }}</p>
          <AppButton type="submit" block :loading="auth.loading">
            {{ auth.loading ? 'Signing in...' : 'Sign in' }}
          </AppButton>
        </form>
      </div>
    </section>
  </main>
</template>

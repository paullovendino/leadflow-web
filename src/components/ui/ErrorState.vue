<script setup lang="ts">
import { CircleAlert } from 'lucide-vue-next'

defineProps<{
  title?: string
  message: string
}>()

const emit = defineEmits<{
  retry: []
}>()
</script>

<template>
  <div class="rounded-[var(--radius-lf)] border border-rose-200 bg-rose-50 px-6 py-10 text-center">
    <CircleAlert class="lf-success-pop mx-auto text-lf-danger" :size="28" :stroke-width="1.75" />
    <h2 class="mt-3 text-base font-semibold text-lf-ink">{{ title ?? 'Unable to load this page' }}</h2>
    <p class="mt-1 text-sm text-rose-800">{{ message }}</p>
    <button
      type="button"
      class="mt-4 text-sm font-medium text-lf-accent-strong hover:underline"
      @click="emit('retry')"
    >
      Try again
    </button>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  title: string
  description: string
}>()
</script>

<template>
  <div class="rounded-[var(--radius-lf)] border border-dashed border-lf-line bg-white px-6 py-12 text-center">
    <h2 class="text-base font-semibold text-lf-ink">{{ title }}</h2>
    <p class="mx-auto mt-1 max-w-md text-sm text-lf-muted">{{ description }}</p>
    <div v-if="$slots.actions" class="mt-4 flex justify-center">
      <slot name="actions" />
    </div>
  </div>
</template>

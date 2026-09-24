<script setup lang="ts">
withDefaults(defineProps<{ rows?: number }>(), { rows: 5 })
</script>

<template>
  <div class="space-y-2 rounded-[var(--radius-lf)] border border-lf-line bg-white p-4" aria-hidden="true">
    <div v-for="row in rows" :key="row" class="skeleton h-10 w-full" />
  </div>
</template>

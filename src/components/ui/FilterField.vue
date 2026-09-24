<script setup lang="ts">
defineProps<{
  label: string
  forId?: string
}>()
</script>

<template>
  <div class="lf-filter">
    <label class="lf-filter-label" :for="forId">{{ label }}</label>
    <slot />
  </div>
</template>

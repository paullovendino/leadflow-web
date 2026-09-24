<script setup lang="ts">
import { computed } from 'vue'
import { initials } from '@/lib/format'

const props = withDefaults(
  defineProps<{
    name?: string | null
    size?: 'sm' | 'md' | 'lg'
  }>(),
  { size: 'md' },
)

const sizeClass = computed(() => {
  if (props.size === 'sm') {
    return 'h-7 w-7 text-[10px]'
  }

  if (props.size === 'lg') {
    return 'h-14 w-14 text-lg'
  }

  return 'h-9 w-9 text-xs'
})
</script>

<template>
  <span
    class="inline-flex shrink-0 items-center justify-center rounded-full bg-[#dceee6] font-semibold text-[#14644a]"
    :class="sizeClass"
    aria-hidden="true"
  >
    {{ initials(name) }}
  </span>
</template>

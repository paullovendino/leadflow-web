<script setup lang="ts">
import { computed } from 'vue'
import type { StageTone } from '@/lib/stage'

const props = withDefaults(
  defineProps<{
    tone?: StageTone
  }>(),
  { tone: 'neutral' },
)

const classes = computed(() => {
  const map: Record<StageTone, string> = {
    neutral: 'bg-slate-100 text-slate-700',
    info: 'bg-sky-50 text-sky-800',
    accent: 'bg-emerald-50 text-emerald-800',
    success: 'bg-emerald-100 text-emerald-900',
    warning: 'bg-amber-50 text-amber-800',
    danger: 'bg-rose-50 text-rose-800',
    violet: 'bg-indigo-50 text-indigo-800',
  }

  return `inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${map[props.tone]}`
})
</script>

<template>
  <span :class="classes">
    <slot />
  </span>
</template>

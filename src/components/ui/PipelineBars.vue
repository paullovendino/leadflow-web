<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  items: Array<{ label: string; count: number }>
}>()

const max = computed(() => Math.max(...props.items.map((item) => item.count), 0))
const total = computed(() => props.items.reduce((sum, item) => sum + item.count, 0))

function width(count: number): string {
  if (max.value === 0) {
    return '0%'
  }

  return `${Math.max((count / max.value) * 100, count > 0 ? 6 : 0)}%`
}
</script>

<template>
  <div v-if="total === 0" class="rounded-lg bg-lf-soft px-4 py-8 text-center">
    <p class="text-sm font-medium text-lf-ink">No pipeline data yet</p>
    <p class="mt-1 text-sm text-lf-muted">Lead activity will appear here as your CRM grows.</p>
  </div>
  <ul v-else class="space-y-3">
    <li v-for="item in items" :key="item.label">
      <div class="mb-1 flex items-center justify-between gap-3">
        <span class="text-sm text-lf-ink">{{ item.label }}</span>
        <span class="text-sm font-medium text-lf-ink">{{ item.count }}</span>
      </div>
      <div class="h-2 overflow-hidden rounded-full bg-lf-soft" :title="`${item.label}: ${item.count} leads`">
        <div
          class="h-full rounded-full bg-lf-accent transition-[width] duration-300"
          :style="{ width: width(item.count) }"
        />
      </div>
    </li>
  </ul>
</template>

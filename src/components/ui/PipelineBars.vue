<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    items: Array<{ label: string; count: number }>
    emptyTitle?: string
    emptyDescription?: string
  }>(),
  {
    emptyTitle: 'No data yet',
    emptyDescription: 'Counts will appear here as records are added.',
  },
)

const max = computed(() => Math.max(...props.items.map((item) => item.count), 0))
const isEmpty = computed(() => props.items.length === 0)

function width(count: number): string {
  if (max.value === 0) {
    return count > 0 ? '6%' : '0%'
  }

  return `${Math.max((count / max.value) * 100, count > 0 ? 6 : 0)}%`
}
</script>

<template>
  <div v-if="isEmpty" class="rounded-lg bg-lf-soft px-4 py-8 text-center">
    <p class="text-sm font-medium text-lf-ink">{{ emptyTitle }}</p>
    <p class="mt-1 text-sm text-lf-muted">{{ emptyDescription }}</p>
  </div>
  <ul v-else class="space-y-3">
    <li v-for="item in items" :key="item.label">
      <div class="mb-1 flex items-center justify-between gap-3">
        <span class="text-sm text-lf-ink">{{ item.label }}</span>
        <span class="text-sm font-medium text-lf-ink">{{ item.count }}</span>
      </div>
      <div class="h-2 overflow-hidden rounded-full bg-lf-soft" :title="`${item.label}: ${item.count}`">
        <div
          class="h-full rounded-full bg-lf-accent transition-[width] duration-300"
          :style="{ width: width(item.count) }"
        />
      </div>
    </li>
  </ul>
</template>

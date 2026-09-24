<script setup lang="ts">
import { CircleAlert, CircleCheck, Info } from 'lucide-vue-next'
import { useToastStore } from '@/stores/toast'

const toast = useToastStore()
</script>

<template>
  <div class="pointer-events-none fixed right-4 bottom-4 z-[60] flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2">
    <TransitionGroup name="lf-toast">
      <div
        v-for="item in toast.items"
        :key="item.id"
        class="pointer-events-auto flex items-start gap-2 rounded-lg border px-3 py-2.5 text-sm shadow-sm"
        :class="{
          'border-emerald-200 bg-emerald-50 text-emerald-900': item.tone === 'success',
          'border-rose-200 bg-rose-50 text-rose-900': item.tone === 'error',
          'border-lf-line bg-white text-lf-ink': item.tone === 'info',
        }"
        role="status"
      >
        <CircleCheck v-if="item.tone === 'success'" :size="16" :stroke-width="1.75" class="mt-0.5 shrink-0" />
        <CircleAlert v-else-if="item.tone === 'error'" :size="16" :stroke-width="1.75" class="mt-0.5 shrink-0" />
        <Info v-else :size="16" :stroke-width="1.75" class="mt-0.5 shrink-0" />
        <span>{{ item.message }}</span>
      </div>
    </TransitionGroup>
  </div>
</template>

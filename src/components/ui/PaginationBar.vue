<script setup lang="ts">
import { computed } from 'vue'
import AppButton from '@/components/ui/AppButton.vue'

const props = defineProps<{
  page: number
  lastPage: number
  perPage: number
  total: number
  noun: string
}>()

const emit = defineEmits<{
  change: [page: number]
}>()

const from = computed(() => (props.total === 0 ? 0 : (props.page - 1) * props.perPage + 1))
const to = computed(() => Math.min(props.page * props.perPage, props.total))
</script>

<template>
  <div class="flex flex-wrap items-center justify-between gap-3 text-sm text-lf-muted">
    <p>Showing {{ from }}–{{ to }} of {{ total }} {{ noun }}</p>
    <div v-if="lastPage > 1" class="flex gap-2">
      <AppButton variant="secondary" :disabled="page <= 1" @click="emit('change', page - 1)">
        Previous
      </AppButton>
      <AppButton variant="secondary" :disabled="page >= lastPage" @click="emit('change', page + 1)">
        Next
      </AppButton>
    </div>
  </div>
</template>

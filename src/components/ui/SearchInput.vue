<script setup lang="ts">
import { computed, ref } from 'vue'
import { Search, X } from 'lucide-vue-next'

const props = withDefaults(
  defineProps<{
    modelValue: string
    placeholder?: string
    label?: string
    id?: string
  }>(),
  {
    placeholder: 'Search...',
    label: 'Search',
    id: 'search-input',
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const input = ref<HTMLInputElement | null>(null)
const hasValue = computed(() => props.modelValue.length > 0)

function onInput(event: Event): void {
  emit('update:modelValue', (event.target as HTMLInputElement).value)
}

function clear(): void {
  emit('update:modelValue', '')
  input.value?.focus()
}

function focus(): void {
  input.value?.focus()
}

defineExpose({ focus })
</script>

<template>
  <div class="lf-search">
    <label class="sr-only" :for="id">{{ label }}</label>
    <Search class="lf-search-icon" :size="16" :stroke-width="1.75" aria-hidden="true" />
    <input
      :id="id"
      ref="input"
      type="search"
      :value="modelValue"
      :placeholder="placeholder"
      class="lf-control lf-search-input"
      :aria-label="label"
      @input="onInput"
    >
    <button
      v-if="hasValue"
      type="button"
      class="lf-search-clear"
      aria-label="Clear search"
      @click="clear"
    >
      <X :size="14" :stroke-width="1.75" />
    </button>
  </div>
</template>

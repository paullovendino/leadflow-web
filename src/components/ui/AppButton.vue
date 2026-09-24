<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
    type?: 'button' | 'submit'
    disabled?: boolean
    loading?: boolean
    block?: boolean
  }>(),
  {
    variant: 'primary',
    type: 'button',
    disabled: false,
    loading: false,
    block: false,
  },
)

const classes = computed(() => {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition duration-150 active:scale-[0.98] motion-reduce:active:scale-100 disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100'

  const variants = {
    primary: 'bg-lf-accent text-white hover:bg-lf-accent-strong',
    secondary: 'border border-lf-line bg-white text-lf-ink hover:bg-lf-soft',
    ghost: 'text-lf-muted hover:bg-lf-soft hover:text-lf-ink',
    danger: 'border border-red-200 bg-red-50 text-lf-danger hover:bg-red-100',
  }

  return [base, variants[props.variant], props.block ? 'w-full' : ''].join(' ')
})

const isDisabled = computed(() => props.disabled || props.loading)
</script>

<template>
  <button :type="type" :disabled="isDisabled" :aria-busy="loading" :class="classes">
    <span v-if="loading" class="lf-spinner" aria-hidden="true" />
    <slot />
  </button>
</template>

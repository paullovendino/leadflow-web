<script setup lang="ts">
import { onMounted, onUnmounted, watch } from 'vue'
import AppButton from '@/components/ui/AppButton.vue'

const props = defineProps<{
  open: boolean
  title: string
  description?: string
  closeOnOverlay?: boolean
}>()

const emit = defineEmits<{
  close: []
}>()

function onKey(event: KeyboardEvent): void {
  if (event.key === 'Escape' && props.open) {
    emit('close')
  }
}

watch(
  () => props.open,
  (open) => {
    document.body.style.overflow = open ? 'hidden' : ''
  },
)

onMounted(() => {
  document.addEventListener('keydown', onKey)
})

onUnmounted(() => {
  document.removeEventListener('keydown', onKey)
  document.body.style.overflow = ''
})
</script>

<template>
  <Teleport to="body">
    <Transition name="lf-modal">
      <div v-if="open" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <button
          type="button"
          class="absolute inset-0 bg-lf-forest/40"
          aria-label="Close dialog"
          @click="closeOnOverlay === false ? undefined : emit('close')"
        />
        <div
          role="dialog"
          aria-modal="true"
          :aria-label="props.title"
          class="lf-modal-panel relative w-full max-w-md rounded-[var(--radius-lf)] border border-lf-line bg-white p-5 shadow-lg"
        >
          <h2 class="text-lg font-semibold text-lf-ink">{{ title }}</h2>
          <p v-if="description" class="mt-1 text-sm text-lf-muted">{{ description }}</p>
          <div class="mt-4">
            <slot />
          </div>
          <div class="mt-5 flex justify-end gap-2">
            <slot name="actions">
              <AppButton variant="secondary" @click="emit('close')">Cancel</AppButton>
            </slot>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

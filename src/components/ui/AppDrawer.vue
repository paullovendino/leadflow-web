<script setup lang="ts">
import { onMounted, onUnmounted, watch } from 'vue'
import { X } from 'lucide-vue-next'

const props = defineProps<{
  open: boolean
  title: string
  description?: string
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
    <Transition name="lf-drawer">
      <div v-if="open" class="fixed inset-0 z-50">
        <button
          type="button"
          class="absolute inset-0 bg-lf-forest/40"
          aria-label="Close panel"
          @click="emit('close')"
        />
        <aside
          role="dialog"
          aria-modal="true"
          :aria-label="props.title"
          class="lf-drawer-panel absolute inset-y-0 right-0 flex w-full max-w-md flex-col border-l border-lf-line bg-white shadow-xl"
        >
          <header class="flex items-start justify-between gap-4 border-b border-lf-line px-5 py-4">
            <div>
              <h2 class="text-lg font-semibold text-lf-ink">{{ title }}</h2>
              <p v-if="description" class="mt-1 text-sm text-lf-muted">{{ description }}</p>
            </div>
            <button
              type="button"
              class="rounded-lg p-1.5 text-lf-muted transition hover:bg-lf-soft hover:text-lf-ink"
              aria-label="Close"
              @click="emit('close')"
            >
              <X :size="18" :stroke-width="1.75" />
            </button>
          </header>
          <div class="flex-1 overflow-y-auto px-5 py-5">
            <slot />
          </div>
        </aside>
      </div>
    </Transition>
  </Teleport>
</template>

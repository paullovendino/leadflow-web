<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import AppSidebar from '@/components/layout/AppSidebar.vue'
import AppTopbar from '@/components/layout/AppTopbar.vue'
import ToastHost from '@/components/ui/ToastHost.vue'

const route = useRoute()
const navOpen = ref(false)

watch(
  () => route.fullPath,
  () => {
    navOpen.value = false
  },
)
</script>

<template>
  <div class="flex min-h-screen bg-lf-canvas">
    <div class="hidden lg:block">
      <div class="sticky top-0 h-screen">
        <AppSidebar :open="true" />
      </div>
    </div>

    <Transition name="lf-drawer">
      <div v-if="navOpen" class="fixed inset-0 z-40 lg:hidden">
        <button type="button" class="absolute inset-0 z-0 bg-lf-forest/50" aria-label="Close navigation" @click="navOpen = false" />
        <div class="lf-drawer-panel relative z-10 h-full w-64 shadow-xl">
          <AppSidebar :open="true" @close="navOpen = false" />
        </div>
      </div>
    </Transition>

    <div class="flex min-w-0 flex-1 flex-col">
      <AppTopbar @open-nav="navOpen = true" />
      <main class="mx-auto w-full max-w-7xl flex-1 px-4 py-6 lg:px-8">
        <RouterView />
      </main>
    </div>
    <ToastHost />
  </div>
</template>

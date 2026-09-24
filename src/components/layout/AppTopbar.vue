<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { LogOut, Menu } from 'lucide-vue-next'
import AppAvatar from '@/components/ui/AppAvatar.vue'
import SearchInput from '@/components/ui/SearchInput.vue'
import { roleLabel } from '@/lib/format'
import { useAuthStore } from '@/stores/auth'

const emit = defineEmits<{
  openNav: []
}>()

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()
const query = ref('')
const menuOpen = ref(false)
const menuRoot = ref<HTMLElement | null>(null)
const searchRef = ref<{ focus: () => void } | null>(null)

const placeholder = computed(() =>
  route.path.startsWith('/customers') ? 'Search customers...' : 'Search leads, customers...',
)

function submitSearch(): void {
  const value = query.value.trim()
  const target = route.path.startsWith('/customers') ? '/customers' : '/leads'

  void router.push({
    path: target,
    query: value ? { q: value } : {},
  })
}

function onKey(event: KeyboardEvent): void {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault()
    searchRef.value?.focus()
  }
}

async function logout(): Promise<void> {
  menuOpen.value = false
  await auth.logout()
  await router.replace({ name: 'login' })
}

function onDocumentClick(event: MouseEvent): void {
  const target = event.target as Node | null
  if (menuOpen.value && target && !menuRoot.value?.contains(target)) {
    menuOpen.value = false
  }
}

onMounted(() => {
  document.addEventListener('keydown', onKey)
  document.addEventListener('click', onDocumentClick)
})

onUnmounted(() => {
  document.removeEventListener('keydown', onKey)
  document.removeEventListener('click', onDocumentClick)
})
</script>

<template>
  <header class="flex h-16 items-center justify-between gap-3 border-b border-lf-line bg-white px-4 lg:px-6">
    <div class="flex min-w-0 flex-1 items-center gap-3">
      <button
        type="button"
        class="rounded-lg p-2 text-lf-muted hover:bg-lf-soft lg:hidden"
        aria-label="Open navigation"
        @click="emit('openNav')"
      >
        <Menu :size="20" :stroke-width="1.75" />
      </button>
      <form class="w-full max-w-md" @submit.prevent="submitSearch">
        <SearchInput
          id="global-search"
          ref="searchRef"
          v-model="query"
          :placeholder="placeholder"
          label="Search"
        />
      </form>
    </div>

    <div ref="menuRoot" class="relative">
      <button
        type="button"
        class="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-lf-soft"
        aria-haspopup="menu"
        :aria-expanded="menuOpen"
        @click.stop="menuOpen = !menuOpen"
      >
        <AppAvatar :name="auth.user?.name" size="sm" />
        <span class="hidden text-left sm:block">
          <span class="block text-sm font-medium text-lf-ink">{{ auth.user?.name }}</span>
          <span class="block text-xs text-lf-muted">{{ roleLabel(auth.user?.role) }}</span>
        </span>
      </button>
      <Transition name="lf-modal">
        <div
          v-if="menuOpen"
          class="absolute right-0 mt-2 w-48 rounded-lg border border-lf-line bg-white p-1 shadow-lg"
          role="menu"
        >
          <button
            type="button"
            class="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-lf-ink hover:bg-lf-soft"
            role="menuitem"
            @click="logout"
          >
            <LogOut :size="15" :stroke-width="1.75" />
            Sign out
          </button>
        </div>
      </Transition>
    </div>
  </header>
</template>

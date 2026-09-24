<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import {
  CalendarClock,
  CalendarDays,
  Kanban,
  LayoutDashboard,
  Sparkles,
  Users,
  UserRound,
  BriefcaseBusiness,
} from 'lucide-vue-next'
import AppAvatar from '@/components/ui/AppAvatar.vue'
import { roleLabel } from '@/lib/format'
import { useAuthStore } from '@/stores/auth'

defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  close: []
}>()

const auth = useAuthStore()
const route = useRoute()

const canManageStaff = computed(
  () => auth.user?.role === 'administrator' || auth.user?.role === 'manager',
)

const workspace = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, match: ['home', 'dashboard'] },
  { to: '/leads', label: 'Leads', icon: Sparkles, match: ['leads', 'lead-detail'] },
  { to: '/pipeline', label: 'Pipeline', icon: Kanban, match: ['pipeline'] },
  { to: '/customers', label: 'Customers', icon: UserRound, match: ['customers', 'customer-detail'] },
  { to: '/appointments', label: 'Appointments', icon: CalendarDays, match: ['appointments', 'appointment-detail'] },
]

const operations = computed(() => {
  const items = [
    { to: '/services', label: 'Services', icon: BriefcaseBusiness, match: ['services'] },
    { to: '/availability', label: 'Availability', icon: CalendarClock, match: ['availability'] },
  ]

  if (canManageStaff.value) {
    items.push({ to: '/users', label: 'Staff', icon: Users, match: ['users'] })
  }

  return items
})

function isActive(match: string[]): boolean {
  return match.includes(String(route.name ?? ''))
}
</script>

<template>
  <aside
    class="flex h-full w-64 shrink-0 flex-col bg-lf-forest text-white"
  >
    <div class="flex items-center gap-2.5 px-5 py-5">
      <span class="flex h-8 w-8 items-center justify-center rounded-lg bg-lf-accent text-sm font-semibold">
        L
      </span>
      <div>
        <p class="text-sm font-semibold tracking-wide">LeadFlow</p>
        <p class="text-[11px] text-white/50">CRM workspace</p>
      </div>
    </div>

    <nav class="flex-1 space-y-6 overflow-y-auto px-3 pb-4">
      <div>
        <p class="px-3 text-[11px] font-semibold tracking-[0.14em] text-white/40">WORKSPACE</p>
        <div class="mt-2 space-y-1">
          <RouterLink
            v-for="item in workspace"
            :key="item.to"
            :to="item.to"
            class="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-white/75 transition hover:bg-white/10 hover:text-white"
            :class="isActive(item.match) ? 'bg-white/10 text-white' : ''"
            @click="emit('close')"
          >
            <span
              class="h-4 w-0.5 rounded-full"
              :class="isActive(item.match) ? 'bg-lf-accent' : 'bg-transparent'"
            />
            <component :is="item.icon" :size="16" :stroke-width="1.75" />
            {{ item.label }}
          </RouterLink>
        </div>
      </div>

      <div>
        <p class="px-3 text-[11px] font-semibold tracking-[0.14em] text-white/40">OPERATIONS</p>
        <div class="mt-2 space-y-1">
          <RouterLink
            v-for="item in operations"
            :key="item.to"
            :to="item.to"
            class="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-white/75 transition hover:bg-white/10 hover:text-white"
            :class="isActive(item.match) ? 'bg-white/10 text-white' : ''"
            @click="emit('close')"
          >
            <span
              class="h-4 w-0.5 rounded-full"
              :class="isActive(item.match) ? 'bg-lf-accent' : 'bg-transparent'"
            />
            <component :is="item.icon" :size="16" :stroke-width="1.75" />
            {{ item.label }}
          </RouterLink>
        </div>
      </div>
    </nav>

    <div class="border-t border-white/10 px-4 py-4">
      <div class="flex items-center gap-3">
        <AppAvatar :name="auth.user?.name" />
        <div class="min-w-0">
          <p class="truncate text-sm font-medium">{{ auth.user?.name }}</p>
          <p class="truncate text-xs text-white/50">{{ roleLabel(auth.user?.role) }}</p>
        </div>
      </div>
    </div>
  </aside>
</template>

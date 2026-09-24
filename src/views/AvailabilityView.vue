<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import axios from 'axios'
import AppBadge from '@/components/ui/AppBadge.vue'
import { friendlyApiError } from '@/lib/errors'
import { useHighlight } from '@/lib/highlight'
import AppButton from '@/components/ui/AppButton.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import ErrorState from '@/components/ui/ErrorState.vue'
import PageHeader from '@/components/ui/PageHeader.vue'
import SkeletonRows from '@/components/ui/SkeletonRows.vue'
import http from '@/lib/http'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'
import type { ApiPaginated, ApiResource, DayOfWeek, StaffAvailability, User } from '@/types/api'

const days: DayOfWeek[] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
]

const dayLabels: Record<DayOfWeek, string> = {
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
  saturday: 'Saturday',
  sunday: 'Sunday',
}

const auth = useAuthStore()
const toast = useToastStore()
const highlight = useHighlight()
const users = ref<User[]>([])
const selectedUserId = ref<number | null>(null)
const slots = ref<StaffAvailability[]>([])
const loading = ref(true)
const saving = ref(false)
const busyId = ref<number | null>(null)
const errorMessage = ref('')
const formError = ref('')
const canManageOthers = computed(
  () => auth.user?.role === 'administrator' || auth.user?.role === 'manager',
)
const form = reactive({
  day_of_week: 'monday' as DayOfWeek,
  start_time: '09:00',
  end_time: '12:00',
})

const ownerId = computed(() => selectedUserId.value ?? auth.user?.id ?? null)
const selectedName = computed(
  () => users.value.find((user) => user.id === ownerId.value)?.name ?? auth.user?.name ?? 'Staff',
)

const grouped = computed(() =>
  days.map((day) => ({
    day,
    slots: slots.value.filter((slot) => slot.day_of_week === day),
  })),
)

async function loadUsers(): Promise<void> {
  if (!canManageOthers.value) {
    selectedUserId.value = auth.user?.id ?? null
    return
  }

  const { data } = await http.get<ApiPaginated<User>>('/api/v1/users')
  users.value = data.data.filter((user) => user.role === 'staff' || user.role === 'manager')
  selectedUserId.value = users.value[0]?.id ?? auth.user?.id ?? null
}

async function loadSlots(): Promise<void> {
  if (!ownerId.value) {
    slots.value = []
    return
  }

  loading.value = true
  errorMessage.value = ''

  try {
    const { data } = await http.get<ApiResource<StaffAvailability[]>>(
      `/api/v1/users/${ownerId.value}/availabilities`,
    )
    slots.value = data.data
  } catch (error) {
    errorMessage.value = friendlyApiError(error, 'Unable to load availability.')
  } finally {
    loading.value = false
  }
}

async function createSlot(): Promise<void> {
  if (!ownerId.value) {
    return
  }

  formError.value = ''
  saving.value = true

  try {
    const { data } = await http.post<ApiResource<StaffAvailability>>(
      `/api/v1/users/${ownerId.value}/availabilities`,
      form,
    )
    slots.value = [...slots.value, data.data]
    highlight.flash(data.data.id)
    toast.push('Availability added')
  } catch (error) {
    formError.value = axios.isAxiosError(error)
      ? (error.response?.data?.errors?.start_time?.[0] ??
        error.response?.data?.errors?.end_time?.[0] ??
        error.response?.data?.message ??
        'Unable to save availability.')
      : 'Unable to save availability.'
  } finally {
    saving.value = false
  }
}

async function toggleSlot(slot: StaffAvailability): Promise<void> {
  if (!ownerId.value) {
    return
  }

  busyId.value = slot.id

  try {
    const path = slot.is_active ? 'deactivate' : 'activate'
    const { data } = await http.post<ApiResource<StaffAvailability>>(
      `/api/v1/users/${ownerId.value}/availabilities/${slot.id}/${path}`,
    )
    slots.value = slots.value.map((item) => (item.id === slot.id ? data.data : item))
    highlight.flash(slot.id)
    toast.push(slot.is_active ? 'Hours deactivated' : 'Hours activated')
  } catch (error) {
    toast.push(friendlyApiError(error, 'Unable to update hours.'), 'error')
  } finally {
    busyId.value = null
  }
}

watch(selectedUserId, () => {
  void loadSlots()
})

onMounted(async () => {
  await loadUsers()
  await loadSlots()
})
</script>

<template>
  <section class="lf-page">
    <PageHeader
      title="Availability"
      description="Recurring working hours. Overlapping times on the same day are rejected."
    />

    <div v-if="canManageOthers" class="max-w-sm">
      <label class="lf-label" for="availability-owner">Staff member</label>
      <select id="availability-owner" v-model.number="selectedUserId" class="lf-control mt-1">
        <option v-for="user in users" :key="user.id" :value="user.id">{{ user.name }}</option>
      </select>
    </div>

    <form class="grid gap-3 rounded-[var(--radius-lf)] border border-lf-line bg-white p-4 md:grid-cols-4" @submit.prevent="createSlot">
      <div class="lf-field">
        <label class="lf-label" for="availability-day">Day</label>
        <select id="availability-day" v-model="form.day_of_week" class="lf-control">
          <option v-for="day in days" :key="day" :value="day">{{ dayLabels[day] }}</option>
        </select>
      </div>
      <div class="lf-field">
        <label class="lf-label" for="availability-start">Start</label>
        <input id="availability-start" v-model="form.start_time" type="time" required class="lf-control">
      </div>
      <div class="lf-field">
        <label class="lf-label" for="availability-end">End</label>
        <input id="availability-end" v-model="form.end_time" type="time" required class="lf-control">
      </div>
      <div class="flex items-end">
        <AppButton type="submit" block :loading="saving">{{ saving ? 'Adding...' : 'Add hours' }}</AppButton>
      </div>
      <p v-if="formError" class="min-h-5 text-sm text-lf-danger md:col-span-4">{{ formError }}</p>
    </form>

    <SkeletonRows v-if="loading" />
    <ErrorState v-else-if="errorMessage" title="Unable to load availability" :message="errorMessage" @retry="loadSlots" />
    <EmptyState
      v-else-if="slots.length === 0"
      title="No hours yet"
      :description="`Add working hours for ${selectedName}.`"
    />

    <div v-else class="rounded-[var(--radius-lf)] border border-lf-line bg-white">
      <div class="border-b border-lf-line px-5 py-4">
        <h2 class="text-sm font-semibold text-lf-ink">{{ selectedName }}</h2>
      </div>
      <ul class="divide-y divide-lf-line">
        <li v-for="group in grouped" :key="group.day" class="grid gap-3 px-5 py-4 md:grid-cols-[8rem_1fr]">
          <p class="text-sm font-medium text-lf-ink">{{ dayLabels[group.day] }}</p>
          <div v-if="group.slots.length" class="space-y-2">
            <div
              v-for="slot in group.slots"
              :key="slot.id"
              class="flex flex-wrap items-center justify-between gap-3 rounded-md"
              :class="{ 'lf-highlight': highlight.has(slot.id) }"
            >
              <p class="text-sm text-lf-muted">
                {{ slot.start_time.slice(0, 5) }} — {{ slot.end_time.slice(0, 5) }}
              </p>
              <div class="flex items-center gap-2">
                <AppBadge :tone="slot.is_active ? 'success' : 'neutral'">
                  {{ slot.is_active ? 'Active' : 'Inactive' }}
                </AppBadge>
                <AppButton
                  :variant="slot.is_active ? 'danger' : 'secondary'"
                  :loading="busyId === slot.id"
                  @click="toggleSlot(slot)"
                >
                  {{ slot.is_active ? 'Deactivate' : 'Activate' }}
                </AppButton>
              </div>
            </div>
          </div>
          <p v-else class="text-sm text-lf-muted">No hours</p>
        </li>
      </ul>
    </div>
  </section>
</template>

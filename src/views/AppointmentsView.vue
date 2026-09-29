<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Plus } from 'lucide-vue-next'
import { listAllAppointments, listAppointments, listCustomers } from '@/api/crm'
import AppointmentCalendar from '@/components/appointments/AppointmentCalendar.vue'
import AppointmentFormDrawer from '@/components/appointments/AppointmentFormDrawer.vue'
import AppAvatar from '@/components/ui/AppAvatar.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppButton from '@/components/ui/AppButton.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import ErrorState from '@/components/ui/ErrorState.vue'
import FilterField from '@/components/ui/FilterField.vue'
import PageHeader from '@/components/ui/PageHeader.vue'
import PaginationBar from '@/components/ui/PaginationBar.vue'
import SearchInput from '@/components/ui/SearchInput.vue'
import SkeletonRows from '@/components/ui/SkeletonRows.vue'
import { friendlyApiError } from '@/lib/errors'
import {
  addDays,
  formatDateOnly,
  formatDayHeading,
  formatTime,
  formatWeekRange,
  manilaToday,
  startOfWeekMonday,
} from '@/lib/format'
import { useHighlight } from '@/lib/highlight'
import { appointmentTone } from '@/lib/stage'
import http from '@/lib/http'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'
import type {
  ApiPaginated,
  Appointment,
  AppointmentFilters,
  AppointmentStatus,
  Customer,
  Service,
  User,
} from '@/types/api'
import { appointmentStatusLabels, appointmentStatuses } from '@/types/api'

const auth = useAuthStore()
const toast = useToastStore()
const route = useRoute()
const router = useRouter()
const highlight = useHighlight()
const canListStaff = computed(
  () => auth.user?.role === 'administrator' || auth.user?.role === 'manager',
)

const appointments = ref<Appointment[]>([])
const calendarAppointments = ref<Appointment[]>([])
const customers = ref<Customer[]>([])
const services = ref<Service[]>([])
const staffMembers = ref<User[]>([])
const meta = ref<ApiPaginated<Appointment>['meta'] | null>(null)
const loading = ref(true)
const refreshing = ref(false)
const errorMessage = ref('')
const showForm = ref(route.query.create === '1')
const searchInput = ref('')
const initialView = String(route.query.view ?? '')
const isDesktop = ref(
  typeof window !== 'undefined' ? window.matchMedia('(min-width: 1024px)').matches : true,
)
const surface = ref<'list' | 'calendar'>(initialView === 'list' ? 'list' : 'calendar')
const grain = ref<'day' | 'week'>(
  initialView === 'day' ? 'day' : initialView === 'week' ? 'week' : isDesktop.value ? 'week' : 'day',
)
const focusDate = ref(manilaToday())
const bookingPreset = reactive({
  scheduledDate: null as string | null,
  startTime: null as string | null,
  staffUserId: null as number | null,
})
const filters = reactive({
  search: '',
  status: '' as AppointmentStatus | '',
  staff_user_id: '' as number | '',
  customer_id: ((): number | '' => {
    const id = Number(route.query.customer_id)
    return Number.isFinite(id) && id > 0 ? id : ''
  })(),
  service_id: '' as number | '',
  date_from: '',
  date_to: '',
  page: 1,
})

let searchTimer: ReturnType<typeof setTimeout> | undefined
let listRequest = 0
let calendarRequest = 0
let media: MediaQueryList | undefined

const calendarMode = computed(() => (isDesktop.value ? grain.value : 'day'))
const weekStart = computed(() => startOfWeekMonday(focusDate.value))
const weekEnd = computed(() => addDays(weekStart.value, 6))
const calendarHeading = computed(() =>
  calendarMode.value === 'week'
    ? formatWeekRange(weekStart.value, weekEnd.value)
    : formatDayHeading(focusDate.value),
)
const empty = computed(() => !loading.value && !errorMessage.value && appointments.value.length === 0)
const calendarEmpty = computed(
  () => !loading.value && !errorMessage.value && calendarAppointments.value.filter((item) => item.status !== 'cancelled').length === 0,
)
const hasFilters = computed(() =>
  Boolean(
    filters.search
    || filters.status
    || filters.staff_user_id
    || filters.customer_id
    || filters.service_id
    || (surface.value === 'list' && (filters.date_from || filters.date_to)),
  ),
)
const presetStaffId = computed(() => {
  if (!canListStaff.value) {
    return null
  }
  return numericId(bookingPreset.staffUserId ?? filters.staff_user_id)
})

function numericId(value: number | string | null | ''): number | null {
  const id = Number(value)
  return Number.isFinite(id) && id > 0 ? id : null
}

function sharedFilters(): AppointmentFilters {
  return {
    search: filters.search || undefined,
    status: filters.status,
    staff_user_id: filters.staff_user_id,
    customer_id: filters.customer_id,
    service_id: filters.service_id,
  }
}

async function loadAppointments(): Promise<void> {
  const request = ++listRequest
  const isInitial = appointments.value.length === 0
  if (isInitial) {
    loading.value = true
  } else {
    refreshing.value = true
  }
  errorMessage.value = ''

  try {
    const response = await listAppointments({
      ...sharedFilters(),
      date_from: filters.date_from || undefined,
      date_to: filters.date_to || undefined,
      page: filters.page,
    })
    if (request !== listRequest) {
      return
    }
    appointments.value = response.data
    meta.value = response.meta
  } catch (error) {
    if (request !== listRequest) {
      return
    }
    errorMessage.value = friendlyApiError(error, 'Unable to load appointments.')
    appointments.value = []
    meta.value = null
  } finally {
    if (request === listRequest) {
      loading.value = false
      refreshing.value = false
    }
  }
}

async function loadCalendar(): Promise<void> {
  const request = ++calendarRequest
  loading.value = true
  errorMessage.value = ''

  try {
    const range = calendarMode.value === 'day'
      ? { date: focusDate.value }
      : { date_from: weekStart.value, date_to: weekEnd.value }

    const rows = await listAllAppointments({
      ...sharedFilters(),
      ...range,
    })
    if (request !== calendarRequest) {
      return
    }
    calendarAppointments.value = rows
  } catch (error) {
    if (request !== calendarRequest) {
      return
    }
    errorMessage.value = friendlyApiError(error, 'Unable to load appointments.')
    calendarAppointments.value = []
  } finally {
    if (request === calendarRequest) {
      loading.value = false
    }
  }
}

function loadCurrent(): void {
  if (surface.value === 'calendar') {
    void loadCalendar()
    return
  }
  void loadAppointments()
}

async function loadLookups(): Promise<void> {
  const [{ data: servicePage }, customerPage] = await Promise.all([
    http.get<ApiPaginated<Service>>('/api/v1/services'),
    listCustomers({ per_page: 100 }),
  ])
  services.value = servicePage.data
  customers.value = customerPage.data

  if (canListStaff.value) {
    const { data } = await http.get<ApiPaginated<User>>('/api/v1/users?is_active=1')
    staffMembers.value = data.data.filter((user) => user.role === 'staff' || user.role === 'manager')
  }
}

function resetFilters(): void {
  filters.search = ''
  searchInput.value = ''
  filters.status = ''
  filters.staff_user_id = ''
  filters.customer_id = ''
  filters.service_id = ''
  filters.date_from = ''
  filters.date_to = ''
  filters.page = 1
}

function clearBookingPreset(): void {
  bookingPreset.scheduledDate = null
  bookingPreset.startTime = null
  bookingPreset.staffUserId = null
}

function openCreate(): void {
  clearBookingPreset()
  showForm.value = true
}

function openCalendarBooking(payload: { date: string; startTime: string }): void {
  bookingPreset.scheduledDate = payload.date
  bookingPreset.startTime = payload.startTime
  bookingPreset.staffUserId = numericId(filters.staff_user_id)
  showForm.value = true
}

function closeForm(): void {
  showForm.value = false
  clearBookingPreset()
}

function onCreated(created: Appointment): void {
  toast.push('Appointment booked successfully.')
  closeForm()

  if (surface.value === 'calendar') {
    void loadCalendar().then(() => highlight.flash(created.id))
    return
  }

  if (filters.page === 1 && !hasFilters.value) {
    appointments.value = [created, ...appointments.value]
    if (meta.value) {
      meta.value = { ...meta.value, total: meta.value.total + 1 }
    }
    highlight.flash(created.id)
    return
  }

  filters.page = 1
  void loadAppointments().then(() => highlight.flash(created.id))
}

function goToday(): void {
  focusDate.value = manilaToday()
}

function goPrevious(): void {
  focusDate.value = calendarMode.value === 'week'
    ? addDays(weekStart.value, -7)
    : addDays(focusDate.value, -1)
}

function goNext(): void {
  focusDate.value = calendarMode.value === 'week'
    ? addDays(weekStart.value, 7)
    : addDays(focusDate.value, 1)
}

function applyBookingQuery(): void {
  const customerId = numericId(String(route.query.customer_id ?? ''))
  if (customerId) {
    filters.customer_id = customerId
  }

  if (route.query.create === '1') {
    clearBookingPreset()
    showForm.value = true
  }
}

function onViewport(event: MediaQueryListEvent | MediaQueryList): void {
  isDesktop.value = event.matches
}

watch(searchInput, (value) => {
  if (searchTimer) {
    clearTimeout(searchTimer)
  }

  searchTimer = setTimeout(() => {
    filters.search = value
    filters.page = 1
  }, 300)
})

watch(
  () => [
    filters.search,
    filters.status,
    filters.staff_user_id,
    filters.customer_id,
    filters.service_id,
    filters.date_from,
    filters.date_to,
    filters.page,
    surface.value,
    calendarMode.value,
    focusDate.value,
  ],
  () => {
    loadCurrent()
  },
  { immediate: true },
)

onMounted(() => {
  media = window.matchMedia('(min-width: 1024px)')
  isDesktop.value = media.matches
  media.addEventListener('change', onViewport)
  applyBookingQuery()
  void loadLookups()
})

watch(
  () => [route.query.customer_id, route.query.create],
  () => {
    applyBookingQuery()
  },
)

onUnmounted(() => {
  if (searchTimer) {
    clearTimeout(searchTimer)
  }
  media?.removeEventListener('change', onViewport)
})
</script>

<template>
  <section class="lf-page">
    <PageHeader title="Appointments" description="Schedule services against staff availability and keep customer bookings in one place.">
      <template #actions>
        <AppButton @click="openCreate">
          <Plus :size="16" :stroke-width="1.75" />
          New appointment
        </AppButton>
      </template>
    </PageHeader>

    <div class="flex flex-wrap items-center justify-between gap-3">
      <div class="flex flex-wrap gap-1 rounded-lg border border-lf-line bg-white p-1">
        <button
          type="button"
          class="rounded-md px-3 py-1.5 text-sm font-medium"
          :class="surface === 'list' ? 'bg-lf-forest text-white' : 'text-lf-muted hover:bg-lf-soft hover:text-lf-ink'"
          :aria-pressed="surface === 'list'"
          @click="surface = 'list'"
        >
          List
        </button>
        <button
          type="button"
          class="rounded-md px-3 py-1.5 text-sm font-medium"
          :class="surface === 'calendar' ? 'bg-lf-forest text-white' : 'text-lf-muted hover:bg-lf-soft hover:text-lf-ink'"
          :aria-pressed="surface === 'calendar'"
          @click="surface = 'calendar'"
        >
          Calendar
        </button>
      </div>

      <div v-if="surface === 'calendar'" class="flex flex-wrap items-center gap-2">
        <div v-if="isDesktop" class="flex gap-1 rounded-lg border border-lf-line bg-white p-1">
          <button
            type="button"
            class="rounded-md px-3 py-1.5 text-sm font-medium"
            :class="calendarMode === 'day' ? 'bg-lf-soft text-lf-ink' : 'text-lf-muted hover:bg-lf-soft'"
            :aria-pressed="calendarMode === 'day'"
            @click="grain = 'day'"
          >
            Day
          </button>
          <button
            type="button"
            class="rounded-md px-3 py-1.5 text-sm font-medium"
            :class="calendarMode === 'week' ? 'bg-lf-soft text-lf-ink' : 'text-lf-muted hover:bg-lf-soft'"
            :aria-pressed="calendarMode === 'week'"
            @click="grain = 'week'"
          >
            Week
          </button>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <AppButton variant="secondary" @click="goPrevious">
            {{ calendarMode === 'week' ? 'Previous week' : 'Previous day' }}
          </AppButton>
          <AppButton variant="secondary" @click="goToday">Today</AppButton>
          <AppButton variant="secondary" @click="goNext">
            {{ calendarMode === 'week' ? 'Next week' : 'Next day' }}
          </AppButton>
        </div>
      </div>
    </div>

    <p v-if="surface === 'calendar'" class="text-sm font-medium text-lf-ink">{{ calendarHeading }}</p>

    <div class="rounded-[var(--radius-lf)] border border-lf-line bg-white p-4">
      <p class="text-sm font-medium text-lf-ink">Filters</p>
      <div class="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <FilterField label="Search" for-id="appointment-search" class="sm:col-span-2">
          <SearchInput
            id="appointment-search"
            v-model="searchInput"
            placeholder="Search customer, staff, or service..."
            label="Search appointments"
          />
        </FilterField>
        <FilterField label="Status" for-id="appointment-status">
          <select id="appointment-status" v-model="filters.status" class="lf-control" @change="filters.page = 1">
            <option value="">All statuses</option>
            <option v-for="status in appointmentStatuses" :key="status" :value="status">
              {{ appointmentStatusLabels[status] }}
            </option>
          </select>
        </FilterField>
        <FilterField label="Service" for-id="appointment-service">
          <select id="appointment-service" v-model="filters.service_id" class="lf-control" @change="filters.page = 1">
            <option value="">All services</option>
            <option v-for="service in services" :key="service.id" :value="service.id">{{ service.name }}</option>
          </select>
        </FilterField>
        <FilterField v-if="canListStaff" label="Staff" for-id="appointment-staff">
          <select id="appointment-staff" v-model="filters.staff_user_id" class="lf-control" @change="filters.page = 1">
            <option value="">All staff</option>
            <option v-for="member in staffMembers" :key="member.id" :value="member.id">{{ member.name }}</option>
          </select>
        </FilterField>
        <FilterField label="Customer" for-id="appointment-customer">
          <select id="appointment-customer" v-model="filters.customer_id" class="lf-control" @change="filters.page = 1">
            <option value="">All customers</option>
            <option v-for="customer in customers" :key="customer.id" :value="customer.id">{{ customer.name }}</option>
          </select>
        </FilterField>
        <template v-if="surface === 'list'">
          <FilterField label="From" for-id="appointment-from">
            <input id="appointment-from" v-model="filters.date_from" type="date" class="lf-control" @change="filters.page = 1">
          </FilterField>
          <FilterField label="To" for-id="appointment-to">
            <input id="appointment-to" v-model="filters.date_to" type="date" class="lf-control" @change="filters.page = 1">
          </FilterField>
        </template>
      </div>
      <div class="mt-3">
        <AppButton variant="ghost" @click="resetFilters">Clear</AppButton>
      </div>
    </div>

    <SkeletonRows v-if="loading" />
    <ErrorState
      v-else-if="errorMessage"
      title="Unable to load appointments"
      :message="errorMessage"
      @retry="loadCurrent"
    />

    <template v-else-if="surface === 'calendar'">
      <p v-if="calendarEmpty" class="text-sm text-lf-muted">No appointments scheduled for this {{ calendarMode }}.</p>
      <AppointmentCalendar
        :grain="calendarMode"
        :focus-date="focusDate"
        :appointments="calendarAppointments"
        @book="openCalendarBooking"
      />
    </template>

    <EmptyState
      v-else-if="empty"
      :title="hasFilters ? 'No matching appointments' : 'No appointments yet'"
      :description="hasFilters ? 'Try a different date range or clear your filters.' : 'Schedule a customer against an active service and available staff member.'"
    >
      <template #actions>
        <AppButton @click="openCreate">New appointment</AppButton>
      </template>
    </EmptyState>

    <template v-else>
      <div class="lf-table-wrap">
        <table class="lf-table">
          <thead>
            <tr>
              <th>Customer</th>
              <th>Service</th>
              <th>Staff</th>
              <th>Date</th>
              <th>Time</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody v-if="refreshing">
            <tr v-for="row in 5" :key="row">
              <td colspan="6"><div class="skeleton h-8 w-full" /></td>
            </tr>
          </tbody>
          <tbody v-else>
            <tr
              v-for="appointment in appointments"
              :key="appointment.id"
              class="cursor-pointer"
              :class="{ 'lf-highlight': highlight.has(appointment.id) }"
              @click="router.push(`/admin/appointments/${appointment.id}`)"
            >
              <td>
                <div class="flex items-center gap-3">
                  <AppAvatar :name="appointment.customer?.name" size="sm" />
                  <p class="font-medium text-lf-ink">{{ appointment.customer?.name ?? '—' }}</p>
                </div>
              </td>
              <td class="text-lf-muted">{{ appointment.service?.name ?? '—' }}</td>
              <td class="text-lf-muted">{{ appointment.staff_user?.name ?? '—' }}</td>
              <td class="text-lf-muted">{{ formatDateOnly(appointment.scheduled_date) }}</td>
              <td class="text-lf-muted">{{ formatTime(appointment.start_time) }} – {{ formatTime(appointment.end_time) }}</td>
              <td>
                <AppBadge :tone="appointmentTone(appointment.status)">
                  {{ appointment.status_label }}
                </AppBadge>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <PaginationBar
        v-if="meta"
        :page="meta.current_page"
        :last-page="meta.last_page"
        :per-page="meta.per_page"
        :total="meta.total"
        noun="appointments"
        @change="filters.page = $event"
      />
    </template>

    <AppointmentFormDrawer
      :open="showForm"
      mode="create"
      :preset-customer-id="numericId(filters.customer_id)"
      :preset-scheduled-date="bookingPreset.scheduledDate"
      :preset-start-time="bookingPreset.startTime"
      :preset-staff-user-id="presetStaffId"
      @close="closeForm"
      @saved="onCreated"
    />
  </section>
</template>

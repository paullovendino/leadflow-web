<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Plus } from 'lucide-vue-next'
import { listAppointments, listCustomers } from '@/api/crm'
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
import { formatDateOnly, formatTime } from '@/lib/format'
import { useHighlight } from '@/lib/highlight'
import { appointmentTone } from '@/lib/stage'
import http from '@/lib/http'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'
import type {
  ApiPaginated,
  Appointment,
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
const customers = ref<Customer[]>([])
const services = ref<Service[]>([])
const staffMembers = ref<User[]>([])
const meta = ref<ApiPaginated<Appointment>['meta'] | null>(null)
const loading = ref(true)
const refreshing = ref(false)
const errorMessage = ref('')
const showForm = ref(false)
const searchInput = ref('')
const filters = reactive({
  search: '',
  status: '' as AppointmentStatus | '',
  staff_user_id: '' as number | '',
  customer_id: '' as number | '',
  service_id: '' as number | '',
  date_from: '',
  date_to: '',
  page: 1,
})

let searchTimer: ReturnType<typeof setTimeout> | undefined

const empty = computed(() => !loading.value && !errorMessage.value && appointments.value.length === 0)
const hasFilters = computed(() =>
  Boolean(
    filters.search
    || filters.status
    || filters.staff_user_id
    || filters.customer_id
    || filters.service_id
    || filters.date_from
    || filters.date_to,
  ),
)

async function loadAppointments(): Promise<void> {
  const isInitial = appointments.value.length === 0
  if (isInitial) {
    loading.value = true
  } else {
    refreshing.value = true
  }
  errorMessage.value = ''

  try {
    const response = await listAppointments({
      search: filters.search || undefined,
      status: filters.status,
      staff_user_id: filters.staff_user_id,
      customer_id: filters.customer_id,
      service_id: filters.service_id,
      date_from: filters.date_from || undefined,
      date_to: filters.date_to || undefined,
      page: filters.page,
    })
    appointments.value = response.data
    meta.value = response.meta
  } catch (error) {
    errorMessage.value = friendlyApiError(error, 'Unable to load appointments.')
    appointments.value = []
    meta.value = null
  } finally {
    loading.value = false
    refreshing.value = false
  }
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

function onCreated(created: Appointment): void {
  toast.push('Appointment created')
  showForm.value = false

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
  ],
  () => {
    void loadAppointments()
  },
)

onMounted(() => {
  const customerId = Number(route.query.customer_id)
  if (Number.isFinite(customerId) && customerId > 0) {
    filters.customer_id = customerId
  }

  if (route.query.create === '1') {
    showForm.value = true
  }

  void loadLookups()
  if (appointments.value.length === 0) {
    void loadAppointments()
  }
})

onUnmounted(() => {
  if (searchTimer) {
    clearTimeout(searchTimer)
  }
})
</script>

<template>
  <section class="lf-page">
    <PageHeader title="Appointments" description="Schedule services against staff availability and keep customer bookings in one place.">
      <template #actions>
        <AppButton @click="showForm = true">
          <Plus :size="16" :stroke-width="1.75" />
          New appointment
        </AppButton>
      </template>
    </PageHeader>

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
        <FilterField label="From" for-id="appointment-from">
          <input id="appointment-from" v-model="filters.date_from" type="date" class="lf-control" @change="filters.page = 1">
        </FilterField>
        <FilterField label="To" for-id="appointment-to">
          <input id="appointment-to" v-model="filters.date_to" type="date" class="lf-control" @change="filters.page = 1">
        </FilterField>
      </div>
      <div class="mt-3">
        <AppButton variant="ghost" @click="resetFilters">Clear</AppButton>
      </div>
    </div>

    <SkeletonRows v-if="loading" />
    <ErrorState v-else-if="errorMessage" title="Unable to load appointments" :message="errorMessage" @retry="loadAppointments" />
    <EmptyState
      v-else-if="empty"
      :title="hasFilters ? 'No matching appointments' : 'No appointments yet'"
      :description="hasFilters ? 'Try a different date range or clear your filters.' : 'Schedule a customer against an active service and available staff member.'"
    >
      <template #actions>
        <AppButton @click="showForm = true">New appointment</AppButton>
      </template>
    </EmptyState>

    <div v-else class="lf-table-wrap">
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
            @click="router.push(`/appointments/${appointment.id}`)"
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

    <AppointmentFormDrawer
      :open="showForm"
      mode="create"
      :preset-customer-id="typeof filters.customer_id === 'number' ? filters.customer_id : null"
      @close="showForm = false"
      @saved="onCreated"
    />
  </section>
</template>

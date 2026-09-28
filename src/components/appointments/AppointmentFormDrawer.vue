<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import {
  createAppointment,
  getCustomer,
  listAppointmentSlots,
  listCustomers,
  updateAppointment,
} from '@/api/crm'
import AppButton from '@/components/ui/AppButton.vue'
import AppDrawer from '@/components/ui/AppDrawer.vue'
import { fieldErrors, friendlyApiError } from '@/lib/errors'
import { todayDateInput } from '@/lib/format'
import http from '@/lib/http'
import { useAuthStore } from '@/stores/auth'
import type { ApiPaginated, Appointment, AppointmentSlot, Customer, Service, User } from '@/types/api'

const props = defineProps<{
  open: boolean
  mode: 'create' | 'reschedule'
  appointment?: Appointment | null
  presetCustomerId?: number | null
}>()

const emit = defineEmits<{
  close: []
  saved: [Appointment]
}>()

const auth = useAuthStore()
const canListStaff = computed(
  () => auth.user?.role === 'administrator' || auth.user?.role === 'manager',
)

const customers = ref<Customer[]>([])
const lockedCustomer = ref<Customer | null>(null)
const services = ref<Service[]>([])
const staffMembers = ref<User[]>([])
const slots = ref<AppointmentSlot[]>([])
const loadingSlots = ref(false)
const saving = ref(false)
const formError = ref('')
const customerLocked = computed(() => props.mode === 'create' && Boolean(props.presetCustomerId))

const form = reactive({
  customer_id: '' as number | '',
  service_id: '' as number | '',
  staff_user_id: '' as number | '',
  scheduled_date: '',
  start_time: '',
  notes: '',
})

const selectedService = computed(() =>
  services.value.find((service) => service.id === Number(form.service_id)),
)

const title = computed(() => (props.mode === 'reschedule' ? 'Reschedule appointment' : 'New appointment'))
const description = computed(() =>
  props.mode === 'reschedule'
    ? 'The backend recalculates duration and checks staff availability.'
    : 'Book a customer against an active service and available staff member.',
)
const submitLabel = computed(() => {
  if (!saving.value) {
    return props.mode === 'reschedule' ? 'Reschedule' : 'Book appointment'
  }

  return props.mode === 'reschedule' ? 'Rescheduling...' : 'Booking...'
})

function resetForm(): void {
  form.customer_id = props.presetCustomerId ?? ''
  form.service_id = ''
  form.staff_user_id = canListStaff.value ? '' : (auth.user?.id ?? '')
  form.scheduled_date = ''
  form.start_time = ''
  form.notes = ''
  slots.value = []
  formError.value = ''
}

function rememberCustomer(customer: Customer): void {
  if (!customers.value.some((item) => item.id === customer.id)) {
    customers.value = [customer, ...customers.value]
  }
}

function hydrateFromAppointment(appointment: Appointment): void {
  form.customer_id = appointment.customer?.id ?? ''
  form.service_id = appointment.service?.id ?? ''
  form.staff_user_id = appointment.staff_user?.id ?? ''
  form.scheduled_date = appointment.scheduled_date
  form.start_time = appointment.start_time
  form.notes = appointment.notes ?? ''
  formError.value = ''
}

async function loadLookups(): Promise<void> {
  const [{ data: servicePage }, customerPage] = await Promise.all([
    http.get<ApiPaginated<Service>>('/api/v1/services?is_active=1'),
    listCustomers({ per_page: 100 }),
  ])
  services.value = servicePage.data.filter((service) => service.is_active)
  customers.value = customerPage.data

  if (props.presetCustomerId) {
    const listed = customers.value.find((item) => item.id === props.presetCustomerId)
    if (listed) {
      lockedCustomer.value = listed
    } else {
      try {
        lockedCustomer.value = await getCustomer(props.presetCustomerId)
        rememberCustomer(lockedCustomer.value)
      } catch {
        lockedCustomer.value = null
      }
    }
    form.customer_id = props.presetCustomerId
  } else {
    lockedCustomer.value = null
  }

  if (canListStaff.value) {
    const { data } = await http.get<ApiPaginated<User>>('/api/v1/users?is_active=1')
    staffMembers.value = data.data.filter((user) => user.role === 'staff' || user.role === 'manager')
  } else if (auth.user) {
    staffMembers.value = [auth.user]
    form.staff_user_id = auth.user.id
  }
}

async function loadSlots(): Promise<void> {
  if (!form.staff_user_id || !form.scheduled_date || !form.service_id) {
    slots.value = []
    return
  }

  slots.value = []
  loadingSlots.value = true

  try {
    slots.value = await listAppointmentSlots({
      staff_user_id: Number(form.staff_user_id),
      date: form.scheduled_date,
      service_id: Number(form.service_id),
      ignore_appointment_id: props.mode === 'reschedule' ? props.appointment?.id : undefined,
    })

    if (form.start_time && !slots.value.some((slot) => slot.start_time === form.start_time)) {
      form.start_time = ''
    }
  } catch {
    slots.value = []
  } finally {
    loadingSlots.value = false
  }
}

async function submit(): Promise<void> {
  formError.value = ''

  if (!form.customer_id || !form.service_id || !form.staff_user_id || !form.scheduled_date || !form.start_time) {
    formError.value = 'Customer, service, staff, date, and time are required.'
    return
  }

  saving.value = true

  try {
    const payload = {
      service_id: Number(form.service_id),
      staff_user_id: Number(form.staff_user_id),
      scheduled_date: form.scheduled_date,
      start_time: form.start_time,
      notes: form.notes || null,
    }

    const saved = props.mode === 'reschedule' && props.appointment
      ? await updateAppointment(props.appointment.id, payload)
      : await createAppointment({
          ...payload,
          customer_id: Number(form.customer_id),
        })

    emit('saved', saved)
    emit('close')
  } catch (error) {
    const fields = fieldErrors(error)
    formError.value = fields.start_time
      || fields.customer_id
      || fields.service_id
      || fields.staff_user_id
      || fields.scheduled_date
      || friendlyApiError(error, 'Unable to save this appointment.')
  } finally {
    saving.value = false
  }
}

watch(
  () => props.open,
  async (open) => {
    if (!open) {
      return
    }

    await loadLookups()

    if (props.mode === 'reschedule' && props.appointment) {
      hydrateFromAppointment(props.appointment)
      await loadSlots()
      return
    }

    resetForm()
    if (props.presetCustomerId) {
      form.customer_id = props.presetCustomerId
    }
  },
)

watch(
  () => [form.staff_user_id, form.scheduled_date, form.service_id],
  () => {
    if (props.open) {
      void loadSlots()
    }
  },
)
</script>

<template>
  <AppDrawer :open="open" :title="title" :description="description" @close="emit('close')">
    <form class="space-y-4" @submit.prevent="submit">
      <div class="lf-field">
        <label class="lf-label" for="appointment-form-customer">Customer</label>
        <p v-if="customerLocked && lockedCustomer" class="lf-control bg-lf-soft">
          {{ lockedCustomer.name }}
        </p>
        <p v-else-if="customerLocked" class="lf-control bg-lf-soft text-lf-muted">Loading customer...</p>
        <select
          v-else
          id="appointment-form-customer"
          v-model="form.customer_id"
          required
          class="lf-control"
          :disabled="mode === 'reschedule'"
        >
          <option value="">Select customer</option>
          <option v-for="customer in customers" :key="customer.id" :value="customer.id">
            {{ customer.name }}
          </option>
        </select>
        <p v-if="customerLocked" class="mt-1 text-xs text-lf-muted">This customer is already selected.</p>
      </div>

      <div class="lf-field">
        <label class="lf-label" for="appointment-form-service">Service</label>
        <select id="appointment-form-service" v-model="form.service_id" required class="lf-control">
          <option value="">Select service</option>
          <option v-for="service in services" :key="service.id" :value="service.id">
            {{ service.name }} ({{ service.duration_minutes }} min)
          </option>
        </select>
        <p v-if="selectedService" class="mt-1 text-xs text-lf-muted">
          Duration: {{ selectedService.duration_minutes }} minutes. End time is calculated by the server.
        </p>
      </div>

      <div class="lf-field">
        <label class="lf-label" for="appointment-form-staff">Staff</label>
        <select id="appointment-form-staff" v-model="form.staff_user_id" required class="lf-control">
          <option value="">Select staff</option>
          <option v-for="member in staffMembers" :key="member.id" :value="member.id">
            {{ member.name }}
          </option>
        </select>
      </div>

      <div class="lf-field">
        <label class="lf-label" for="appointment-form-date">Date</label>
        <input
          id="appointment-form-date"
          v-model="form.scheduled_date"
          type="date"
          required
          class="lf-control"
          :min="todayDateInput()"
        >
      </div>

      <div class="lf-field">
        <p class="lf-label">Available times</p>
        <p v-if="!form.staff_user_id || !form.scheduled_date || !form.service_id" class="mt-1 text-sm text-lf-muted">
          Select a service, staff member, and date to see available times.
        </p>
        <p v-else-if="loadingSlots" class="mt-1 text-sm text-lf-muted">Loading available times...</p>
        <p v-else-if="slots.length === 0" class="mt-1 text-sm text-lf-muted">
          No available slots for this staff member on the selected date.
        </p>
        <div v-else class="mt-2 flex flex-wrap gap-2">
          <button
            v-for="slot in slots"
            :key="slot.start_time"
            type="button"
            class="rounded-lg border px-2.5 py-1.5 text-sm transition"
            :class="form.start_time === slot.start_time
              ? 'border-lf-accent bg-lf-accent text-white'
              : 'border-lf-line bg-white text-lf-ink hover:border-lf-accent'"
            @click="form.start_time = slot.start_time"
          >
            {{ slot.start_time }}
          </button>
        </div>
      </div>

      <div class="lf-field">
        <label class="lf-label" for="appointment-form-notes">Notes</label>
        <textarea id="appointment-form-notes" v-model="form.notes" rows="3" class="lf-control" />
      </div>

      <p v-if="formError" class="min-h-5 text-sm text-lf-danger">{{ formError }}</p>
      <div class="flex justify-end gap-2">
        <AppButton variant="secondary" type="button" @click="emit('close')">Cancel</AppButton>
        <AppButton type="submit" :loading="saving" :disabled="loadingSlots">{{ submitLabel }}</AppButton>
      </div>
    </form>
  </AppDrawer>
</template>

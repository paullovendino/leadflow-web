<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { changeAppointmentStatus, getAppointment } from '@/api/crm'
import AppointmentFormDrawer from '@/components/appointments/AppointmentFormDrawer.vue'
import AppAvatar from '@/components/ui/AppAvatar.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppButton from '@/components/ui/AppButton.vue'
import ErrorState from '@/components/ui/ErrorState.vue'
import SkeletonRows from '@/components/ui/SkeletonRows.vue'
import { friendlyApiError } from '@/lib/errors'
import { formatDateOnly, formatDateTime, formatTime } from '@/lib/format'
import { appointmentTone } from '@/lib/stage'
import { useToastStore } from '@/stores/toast'
import type { Appointment, AppointmentStatus } from '@/types/api'
import { appointmentStatusLabels } from '@/types/api'

const route = useRoute()
const router = useRouter()
const toast = useToastStore()

const appointment = ref<Appointment | null>(null)
const loading = ref(true)
const errorMessage = ref('')
const actionError = ref('')
const statusBusy = ref<AppointmentStatus | null>(null)
const showReschedule = ref(false)
const savedFlash = ref(false)

const appointmentId = computed(() => Number(route.params.id))
const canReschedule = computed(() =>
  appointment.value?.status === 'scheduled' || appointment.value?.status === 'confirmed',
)

const statusActions: { status: AppointmentStatus; label: string; loading: string; variant: 'primary' | 'secondary' | 'danger' }[] = [
  { status: 'confirmed', label: 'Confirm', loading: 'Confirming...', variant: 'primary' },
  { status: 'completed', label: 'Complete', loading: 'Completing...', variant: 'secondary' },
  { status: 'cancelled', label: 'Cancel', loading: 'Cancelling...', variant: 'danger' },
  { status: 'no_show', label: 'Mark no show', loading: 'Saving...', variant: 'secondary' },
]

const visibleActions = computed(() =>
  statusActions.filter((action) => appointment.value?.allowed_transitions.includes(action.status)),
)

function applyAppointment(next: Appointment): void {
  const current = appointment.value
  appointment.value = {
    ...current,
    ...next,
    customer: next.customer ?? current?.customer,
    service: next.service ?? current?.service,
    staff_user: next.staff_user ?? current?.staff_user,
    activities: next.activities ?? current?.activities,
  }
}

function flashSaved(): void {
  savedFlash.value = true
  window.setTimeout(() => {
    savedFlash.value = false
  }, 700)
}

async function load(): Promise<void> {
  loading.value = true
  errorMessage.value = ''

  try {
    appointment.value = await getAppointment(appointmentId.value)
  } catch (error) {
    errorMessage.value = friendlyApiError(error, 'Unable to load this appointment.')
    appointment.value = null
  } finally {
    loading.value = false
  }
}

async function changeStatus(status: AppointmentStatus): Promise<void> {
  if (!appointment.value) {
    return
  }

  actionError.value = ''
  statusBusy.value = status

  try {
    applyAppointment(await changeAppointmentStatus(appointment.value.id, status))
    flashSaved()
    toast.push(appointmentStatusLabels[status])
  } catch (error) {
    actionError.value = friendlyApiError(error, 'Unable to update this appointment.')
  } finally {
    statusBusy.value = null
  }
}

function onRescheduled(next: Appointment): void {
  applyAppointment(next)
  showReschedule.value = false
  flashSaved()
  toast.push('Appointment rescheduled')
}

onMounted(() => {
  if (Number.isNaN(appointmentId.value)) {
    void router.replace({ name: 'appointments' })
    return
  }

  void load()
})
</script>

<template>
  <section class="lf-page">
    <button type="button" class="text-sm text-lf-accent hover:underline" @click="router.push({ name: 'appointments' })">
      ← Back to appointments
    </button>

    <SkeletonRows v-if="loading" />
    <ErrorState v-else-if="errorMessage" title="Unable to load this appointment" :message="errorMessage" @retry="load" />

    <template v-else-if="appointment">
      <header class="rounded-[var(--radius-lf)] border border-lf-line bg-white p-5" :class="{ 'lf-highlight': savedFlash }">
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div class="flex flex-wrap items-start gap-4">
            <AppAvatar :name="appointment.customer?.name" size="lg" />
            <div>
              <p class="text-xs text-lf-muted">Appointments / {{ appointment.customer?.name ?? 'Customer' }}</p>
              <h1 class="mt-1 text-2xl font-semibold text-lf-ink">{{ appointment.service?.name ?? 'Appointment' }}</h1>
              <p class="mt-1 text-sm text-lf-muted">
                {{ formatDateOnly(appointment.scheduled_date) }}
                · {{ formatTime(appointment.start_time) }} – {{ formatTime(appointment.end_time) }}
              </p>
              <div class="mt-2">
                <AppBadge :tone="appointmentTone(appointment.status)">{{ appointment.status_label }}</AppBadge>
              </div>
            </div>
          </div>
          <div class="flex flex-wrap gap-2">
            <AppButton v-if="canReschedule" variant="secondary" @click="showReschedule = true">
              Reschedule
            </AppButton>
            <AppButton
              v-for="action in visibleActions"
              :key="action.status"
              :variant="action.variant"
              :loading="statusBusy === action.status"
              :disabled="statusBusy !== null && statusBusy !== action.status"
              @click="changeStatus(action.status)"
            >
              {{ statusBusy === action.status ? action.loading : action.label }}
            </AppButton>
          </div>
        </div>
      </header>

      <p v-if="actionError" class="min-h-5 text-sm text-lf-danger">{{ actionError }}</p>

      <div class="grid gap-5 lg:grid-cols-3">
        <div class="space-y-5 lg:col-span-2">
          <section class="rounded-[var(--radius-lf)] border border-lf-line bg-white p-5">
            <h2 class="text-sm font-semibold text-lf-ink">Appointment details</h2>
            <dl class="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <dt class="text-xs text-lf-muted">Customer</dt>
                <dd class="mt-1">
                  <button
                    v-if="appointment.customer"
                    type="button"
                    class="font-medium text-lf-ink hover:text-lf-accent"
                    @click="router.push(`/customers/${appointment.customer.id}`)"
                  >
                    {{ appointment.customer.name }}
                  </button>
                  <span v-else>—</span>
                </dd>
              </div>
              <div>
                <dt class="text-xs text-lf-muted">Staff</dt>
                <dd class="mt-1 text-sm text-lf-ink">{{ appointment.staff_user?.name ?? '—' }}</dd>
              </div>
              <div>
                <dt class="text-xs text-lf-muted">Service</dt>
                <dd class="mt-1 text-sm text-lf-ink">{{ appointment.service?.name ?? '—' }}</dd>
              </div>
              <div>
                <dt class="text-xs text-lf-muted">Duration</dt>
                <dd class="mt-1 text-sm text-lf-ink">{{ appointment.duration_minutes ?? appointment.service?.duration_minutes ?? '—' }} minutes</dd>
              </div>
              <div>
                <dt class="text-xs text-lf-muted">Date</dt>
                <dd class="mt-1 text-sm text-lf-ink">{{ formatDateOnly(appointment.scheduled_date) }}</dd>
              </div>
              <div>
                <dt class="text-xs text-lf-muted">Time</dt>
                <dd class="mt-1 text-sm text-lf-ink">
                  {{ formatTime(appointment.start_time) }} – {{ formatTime(appointment.end_time) }}
                </dd>
              </div>
            </dl>
            <div class="mt-4">
              <p class="text-xs text-lf-muted">Notes</p>
              <p class="mt-1 text-sm text-lf-ink">{{ appointment.notes || 'No notes.' }}</p>
            </div>
          </section>
        </div>

        <section class="rounded-[var(--radius-lf)] border border-lf-line bg-white p-5">
          <h2 class="text-sm font-semibold text-lf-ink">Activity</h2>
          <ol class="mt-4 space-y-3">
            <li v-for="activity in appointment.activities ?? []" :key="activity.id" class="border-l-2 border-lf-accent/30 pl-3">
              <p class="text-sm text-lf-ink">{{ activity.description }}</p>
              <p class="text-xs text-lf-muted">{{ activity.user?.name ?? 'System' }} · {{ formatDateTime(activity.created_at) }}</p>
            </li>
            <li v-if="!(appointment.activities ?? []).length" class="text-sm text-lf-muted">No activity yet.</li>
          </ol>
        </section>
      </div>
    </template>

    <AppointmentFormDrawer
      :open="showReschedule"
      mode="reschedule"
      :appointment="appointment"
      @close="showReschedule = false"
      @saved="onRescheduled"
    />
  </section>
</template>

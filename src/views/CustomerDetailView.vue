<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { createCustomerNote, getCustomer, updateCustomer } from '@/api/crm'
import { friendlyApiError } from '@/lib/errors'
import AppAvatar from '@/components/ui/AppAvatar.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppButton from '@/components/ui/AppButton.vue'
import ErrorState from '@/components/ui/ErrorState.vue'
import SkeletonRows from '@/components/ui/SkeletonRows.vue'
import StageBadge from '@/components/ui/StageBadge.vue'
import { contactLine, formatDateOnly, formatDateTime, formatTime, todayDateInput } from '@/lib/format'
import { appointmentTone } from '@/lib/stage'
import { useToastStore } from '@/stores/toast'
import type { Appointment, Customer, LeadSource } from '@/types/api'
import { leadSourceLabels, leadSources } from '@/types/api'

const route = useRoute()
const router = useRouter()
const toast = useToastStore()

const customer = ref<Customer | null>(null)
const loading = ref(true)
const errorMessage = ref('')
const actionError = ref('')
const noteBody = ref('')
const saving = ref(false)
const noting = ref(false)
const savedFlash = ref(false)

const form = reactive({
  name: '',
  email: '',
  phone: '',
  source: '' as LeadSource | '',
})

const customerId = computed(() => Number(route.params.id))

function hydrate(next: Customer): void {
  customer.value = next
  form.name = next.name
  form.email = next.email ?? ''
  form.phone = next.phone ?? ''
  form.source = next.source ?? ''
}

function applyCustomer(next: Customer): void {
  const current = customer.value
  hydrate({
    ...current,
    ...next,
    leads: next.leads ?? current?.leads,
    notes: next.notes ?? current?.notes,
    activities: next.activities ?? current?.activities,
    appointments: next.appointments ?? current?.appointments,
  })
}

function isUpcoming(appointment: Appointment): boolean {
  if (appointment.status === 'completed' || appointment.status === 'cancelled' || appointment.status === 'no_show') {
    return false
  }

  return appointment.scheduled_date >= todayDateInput()
}

const upcomingAppointments = computed(() =>
  (customer.value?.appointments ?? []).filter((appointment) => isUpcoming(appointment)),
)

const pastAppointments = computed(() =>
  (customer.value?.appointments ?? []).filter((appointment) => !isUpcoming(appointment)),
)

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
    hydrate(await getCustomer(customerId.value))
  } catch (error) {
    errorMessage.value = friendlyApiError(error, 'Unable to load this customer.')
    customer.value = null
  } finally {
    loading.value = false
  }
}

async function saveDetails(): Promise<void> {
  if (!customer.value) {
    return
  }

  actionError.value = ''
  saving.value = true

  try {
    applyCustomer(await updateCustomer(customer.value.id, {
      name: form.name,
      email: form.email || null,
      phone: form.phone || null,
      source: form.source || null,
    }))
    flashSaved()
    toast.push('Customer updated')
  } catch (error) {
    actionError.value = friendlyApiError(error, 'Unable to update this customer.')
  } finally {
    saving.value = false
  }
}

async function submitNote(): Promise<void> {
  if (!customer.value || !noteBody.value.trim()) {
    return
  }

  actionError.value = ''
  noting.value = true

  try {
    const note = await createCustomerNote(customer.value.id, noteBody.value.trim())
    noteBody.value = ''
    customer.value = {
      ...customer.value,
      notes: [note, ...(customer.value.notes ?? [])],
    }
    toast.push('Note added')
  } catch (error) {
    actionError.value = friendlyApiError(error, 'Unable to add note.')
  } finally {
    noting.value = false
  }
}

onMounted(() => {
  if (Number.isNaN(customerId.value)) {
    void router.replace({ name: 'customers' })
    return
  }

  void load()
})
</script>

<template>
  <section class="lf-page">
    <button type="button" class="text-sm text-lf-accent hover:underline" @click="router.push({ name: 'customers' })">
      ← Back to customers
    </button>

    <SkeletonRows v-if="loading" />
    <ErrorState v-else-if="errorMessage" title="Unable to load this customer" :message="errorMessage" @retry="load" />

    <template v-else-if="customer">
      <header class="rounded-[var(--radius-lf)] border border-lf-line bg-white p-5" :class="{ 'lf-highlight': savedFlash }">
        <div class="flex flex-wrap items-start gap-4">
          <AppAvatar :name="customer.name" size="lg" />
          <div>
            <p class="text-xs text-lf-muted">Customers / {{ customer.name }}</p>
            <h1 class="mt-1 text-2xl font-semibold text-lf-ink">{{ customer.name }}</h1>
            <p class="mt-1 text-sm text-lf-muted">{{ contactLine(customer.email, customer.phone) }}</p>
            <div class="mt-2">
              <AppBadge v-if="customer.source">{{ leadSourceLabels[customer.source] }}</AppBadge>
            </div>
          </div>
        </div>
      </header>

      <p v-if="actionError" class="min-h-5 text-sm text-lf-danger">{{ actionError }}</p>

      <div class="grid gap-5 lg:grid-cols-3">
        <div class="space-y-5 lg:col-span-2">
          <section class="rounded-[var(--radius-lf)] border border-lf-line bg-white p-5">
            <h2 class="text-sm font-semibold text-lf-ink">Customer information</h2>
            <form class="mt-4 grid gap-4 md:grid-cols-2" @submit.prevent="saveDetails">
              <div class="lf-field">
                <label class="lf-label" for="customer-name">Name</label>
                <input id="customer-name" v-model="form.name" required class="lf-control">
              </div>
              <div class="lf-field">
                <label class="lf-label" for="customer-source">Source</label>
                <select id="customer-source" v-model="form.source" class="lf-control">
                  <option value="">Select source</option>
                  <option v-for="source in leadSources" :key="source" :value="source">{{ leadSourceLabels[source] }}</option>
                </select>
              </div>
              <div class="lf-field">
                <label class="lf-label" for="customer-email">Email</label>
                <input id="customer-email" v-model="form.email" type="email" class="lf-control">
              </div>
              <div class="lf-field">
                <label class="lf-label" for="customer-phone">Phone</label>
                <input id="customer-phone" v-model="form.phone" class="lf-control">
              </div>
              <AppButton type="submit" :loading="saving">{{ saving ? 'Saving...' : 'Save details' }}</AppButton>
            </form>
          </section>

          <section class="rounded-[var(--radius-lf)] border border-lf-line bg-white p-5">
            <h2 class="text-sm font-semibold text-lf-ink">Related leads</h2>
            <ul class="mt-4 divide-y divide-lf-line">
              <li v-for="related in customer.leads ?? []" :key="related.id" class="flex items-center justify-between gap-3 py-3">
                <div>
                  <button type="button" class="font-medium text-lf-ink hover:text-lf-accent" @click="router.push(`/leads/${related.id}`)">
                    {{ related.name }}
                  </button>
                  <p class="text-xs text-lf-muted">{{ related.assigned_user?.name ?? 'Unassigned' }}</p>
                </div>
                <StageBadge :name="related.pipeline_stage?.name" :slug="related.pipeline_stage?.slug" />
              </li>
              <li v-if="!(customer.leads ?? []).length" class="py-3 text-sm text-lf-muted">
                No related leads. This customer was created directly.
              </li>
            </ul>
          </section>

          <section class="rounded-[var(--radius-lf)] border border-lf-line bg-white p-5">
            <h2 class="text-sm font-semibold text-lf-ink">Notes</h2>
            <form class="mt-4" @submit.prevent="submitNote">
              <label class="lf-label" for="customer-note">Add a note</label>
              <textarea id="customer-note" v-model="noteBody" rows="3" required class="lf-control mt-1" placeholder="Add relationship context" />
              <AppButton type="submit" class="mt-3" :loading="noting">{{ noting ? 'Adding...' : 'Add note' }}</AppButton>
            </form>
            <ul class="mt-4 divide-y divide-lf-line">
              <li v-for="note in customer.notes ?? []" :key="note.id" class="py-3">
                <p class="text-sm text-lf-ink">{{ note.body }}</p>
                <p class="mt-1 text-xs text-lf-muted">{{ note.user?.name ?? 'Unknown' }} · {{ formatDateTime(note.created_at) }}</p>
              </li>
              <li v-if="!(customer.notes ?? []).length" class="py-3 text-sm text-lf-muted">No notes yet.</li>
            </ul>
          </section>
        </div>

        <div class="space-y-5">
          <section class="rounded-[var(--radius-lf)] border border-lf-line bg-white p-5">
            <div class="flex items-center justify-between gap-3">
              <h2 class="text-sm font-semibold text-lf-ink">Appointments</h2>
              <AppButton
                variant="secondary"
                @click="router.push({ name: 'appointments', query: { customer_id: String(customer.id), create: '1' } })"
              >
                Schedule
              </AppButton>
            </div>

            <div class="mt-4">
              <p class="text-xs font-medium uppercase tracking-wide text-lf-muted">Upcoming</p>
              <ul class="mt-2 divide-y divide-lf-line">
                <li
                  v-for="item in upcomingAppointments"
                  :key="item.id"
                  class="cursor-pointer py-3"
                  @click="router.push(`/appointments/${item.id}`)"
                >
                  <p class="text-sm font-medium text-lf-ink">{{ item.service?.name ?? 'Appointment' }}</p>
                  <p class="mt-0.5 text-xs text-lf-muted">
                    {{ formatDateOnly(item.scheduled_date) }}
                    · {{ formatTime(item.start_time) }} – {{ formatTime(item.end_time) }}
                    · {{ item.staff_user?.name ?? 'Unassigned' }}
                  </p>
                  <div class="mt-1">
                    <AppBadge :tone="appointmentTone(item.status)">{{ item.status_label }}</AppBadge>
                  </div>
                </li>
                <li v-if="upcomingAppointments.length === 0" class="py-3 text-sm text-lf-muted">
                  No upcoming appointments.
                </li>
              </ul>
            </div>

            <div class="mt-4">
              <p class="text-xs font-medium uppercase tracking-wide text-lf-muted">Recent</p>
              <ul class="mt-2 divide-y divide-lf-line">
                <li
                  v-for="item in pastAppointments"
                  :key="item.id"
                  class="cursor-pointer py-3"
                  @click="router.push(`/appointments/${item.id}`)"
                >
                  <p class="text-sm font-medium text-lf-ink">{{ item.service?.name ?? 'Appointment' }}</p>
                  <p class="mt-0.5 text-xs text-lf-muted">
                    {{ formatDateOnly(item.scheduled_date) }}
                    · {{ formatTime(item.start_time) }} – {{ formatTime(item.end_time) }}
                    · {{ item.staff_user?.name ?? 'Unassigned' }}
                  </p>
                  <div class="mt-1">
                    <AppBadge :tone="appointmentTone(item.status)">{{ item.status_label }}</AppBadge>
                  </div>
                </li>
                <li v-if="pastAppointments.length === 0" class="py-3 text-sm text-lf-muted">
                  No past appointments.
                </li>
              </ul>
            </div>
          </section>

          <section class="rounded-[var(--radius-lf)] border border-lf-line bg-white p-5">
            <h2 class="text-sm font-semibold text-lf-ink">Activity</h2>
            <ol class="mt-4 space-y-3">
              <li v-for="activity in customer.activities ?? []" :key="activity.id" class="border-l-2 border-lf-accent/30 pl-3">
                <p class="text-sm text-lf-ink">{{ activity.description }}</p>
                <p class="text-xs text-lf-muted">{{ activity.user?.name ?? 'System' }} · {{ formatDateTime(activity.created_at) }}</p>
              </li>
              <li v-if="!(customer.activities ?? []).length" class="text-sm text-lf-muted">No activity yet.</li>
            </ol>
          </section>
        </div>
      </div>
    </template>
  </section>
</template>

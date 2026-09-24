<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { CircleCheck } from 'lucide-vue-next'
import {
  assignLead,
  convertLead,
  createNote,
  getLead,
  getPipeline,
  moveLead,
  updateLead,
} from '@/api/crm'
import { friendlyApiError } from '@/lib/errors'
import AppAvatar from '@/components/ui/AppAvatar.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppModal from '@/components/ui/AppModal.vue'
import ErrorState from '@/components/ui/ErrorState.vue'
import SkeletonRows from '@/components/ui/SkeletonRows.vue'
import StageBadge from '@/components/ui/StageBadge.vue'
import http from '@/lib/http'
import { formatDateTime } from '@/lib/format'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'
import type { ApiPaginated, Lead, LeadSource, PipelineStage, Service, User } from '@/types/api'
import { leadSourceLabels, leadSources } from '@/types/api'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const toast = useToastStore()

const lead = ref<Lead | null>(null)
const stages = ref<PipelineStage[]>([])
const services = ref<Service[]>([])
const assignees = ref<User[]>([])
const loading = ref(true)
const errorMessage = ref('')
const actionError = ref('')
const noteBody = ref('')
const saving = ref(false)
const assigning = ref(false)
const moving = ref(false)
const noting = ref(false)
const converting = ref(false)
const confirmConvert = ref(false)
const convertSuccess = ref(false)
const savedFlash = ref(false)

const canAssign = computed(
  () => auth.user?.role === 'administrator' || auth.user?.role === 'manager',
)

const stageOptions = computed(() =>
  stages.value.filter((item) => item.is_active || item.id === lead.value?.pipeline_stage?.id),
)

const form = reactive({
  name: '',
  email: '',
  phone: '',
  source: '' as LeadSource | '',
  service_id: '' as number | '',
  message: '',
})

const assignmentId = ref<number | ''>('')
const stageId = ref<number | ''>('')
const leadId = computed(() => Number(route.params.id))

function hydrate(next: Lead): void {
  lead.value = next
  form.name = next.name
  form.email = next.email ?? ''
  form.phone = next.phone ?? ''
  form.source = next.source ?? ''
  form.service_id = next.service?.id ?? ''
  form.message = next.message ?? ''
  assignmentId.value = next.assigned_user?.id ?? ''
  stageId.value = next.pipeline_stage?.id ?? ''
}

function applyLead(next: Lead): void {
  const current = lead.value
  hydrate({
    ...current,
    ...next,
    notes: next.notes ?? current?.notes,
    activities: next.activities ?? current?.activities,
    customer: next.customer ?? current?.customer,
  })
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
    const [next, pipeline, servicePage] = await Promise.all([
      getLead(leadId.value),
      getPipeline(),
      http.get<ApiPaginated<Service>>('/api/v1/services'),
    ])
    hydrate(next)
    stages.value = pipeline.stages
    services.value = servicePage.data.data

    if (canAssign.value) {
      const { data } = await http.get<ApiPaginated<User>>('/api/v1/users?is_active=1')
      assignees.value = data.data.filter((user) => user.role === 'staff' || user.role === 'manager')
    }
  } catch (error) {
    errorMessage.value = friendlyApiError(error, 'Unable to load this lead.')
    lead.value = null
  } finally {
    loading.value = false
  }
}

async function saveDetails(): Promise<void> {
  if (!lead.value) {
    return
  }

  actionError.value = ''
  saving.value = true

  try {
    applyLead(await updateLead(lead.value.id, {
      name: form.name,
      email: form.email || null,
      phone: form.phone || null,
      source: form.source || null,
      service_id: form.service_id || null,
      message: form.message || null,
    }))
    flashSaved()
    toast.push('Lead updated')
  } catch (error) {
    actionError.value = friendlyApiError(error, 'Unable to update this lead.')
  } finally {
    saving.value = false
  }
}

async function saveAssignment(): Promise<void> {
  if (!lead.value) {
    return
  }

  actionError.value = ''
  assigning.value = true

  try {
    applyLead(await assignLead(lead.value.id, assignmentId.value === '' ? null : Number(assignmentId.value)))
    toast.push('Lead assignment updated')
  } catch (error) {
    actionError.value = friendlyApiError(error, 'Unable to assign this lead.')
  } finally {
    assigning.value = false
  }
}

async function saveStage(): Promise<void> {
  if (!lead.value || stageId.value === '') {
    return
  }

  actionError.value = ''
  moving.value = true

  try {
    applyLead(await moveLead(lead.value.id, Number(stageId.value)))
    toast.push('Lead stage updated')
  } catch (error) {
    actionError.value = friendlyApiError(error, 'Unable to move this lead.')
  } finally {
    moving.value = false
  }
}

async function submitNote(): Promise<void> {
  if (!lead.value || !noteBody.value.trim()) {
    return
  }

  actionError.value = ''
  noting.value = true

  try {
    const note = await createNote(lead.value.id, noteBody.value.trim())
    noteBody.value = ''
    lead.value = {
      ...lead.value,
      notes: [note, ...(lead.value.notes ?? [])],
    }
    toast.push('Note added')
  } catch (error) {
    actionError.value = friendlyApiError(error, 'Unable to add note.')
  } finally {
    noting.value = false
  }
}

async function confirmConversion(): Promise<void> {
  if (!lead.value) {
    return
  }

  actionError.value = ''
  converting.value = true

  try {
    applyLead(await convertLead(lead.value.id))
    convertSuccess.value = true
    toast.push('Lead converted successfully')
  } catch (error) {
    actionError.value = friendlyApiError(error, 'Unable to convert this lead.')
  } finally {
    converting.value = false
  }
}

function closeConvert(): void {
  if (converting.value) {
    return
  }

  confirmConvert.value = false
  convertSuccess.value = false
}

onMounted(() => {
  if (Number.isNaN(leadId.value)) {
    void router.replace({ name: 'leads' })
    return
  }

  void load()
})
</script>

<template>
  <section class="lf-page">
    <button type="button" class="text-sm text-lf-accent hover:underline" @click="router.push({ name: 'leads' })">
      ← Back to leads
    </button>

    <SkeletonRows v-if="loading" />
    <ErrorState v-else-if="errorMessage" title="Unable to load this lead" :message="errorMessage" @retry="load" />

    <template v-else-if="lead">
      <header class="flex flex-wrap items-start justify-between gap-4">
        <div class="flex items-start gap-3">
          <AppAvatar :name="lead.name" size="lg" />
          <div>
            <p class="text-xs text-lf-muted">Leads / {{ lead.name }}</p>
            <h1 class="mt-1 text-2xl font-semibold text-lf-ink">{{ lead.name }}</h1>
            <div class="mt-2 flex flex-wrap items-center gap-2">
              <StageBadge :name="lead.pipeline_stage?.name" :slug="lead.pipeline_stage?.slug" />
              <span class="text-sm text-lf-muted">{{ lead.assigned_user?.name ?? 'Unassigned' }}</span>
            </div>
          </div>
        </div>
        <div class="flex flex-wrap gap-2">
          <AppButton v-if="lead.customer" variant="secondary" @click="router.push(`/customers/${lead.customer.id}`)">
            View customer
          </AppButton>
          <AppButton v-else @click="confirmConvert = true">Convert to customer</AppButton>
        </div>
      </header>

      <p v-if="actionError" class="min-h-5 text-sm text-lf-danger">{{ actionError }}</p>

      <div class="grid gap-5 lg:grid-cols-3">
        <div class="space-y-5 lg:col-span-2">
          <section
            class="rounded-[var(--radius-lf)] border border-lf-line bg-white p-5"
            :class="{ 'lf-highlight': savedFlash }"
          >
            <h2 class="text-sm font-semibold text-lf-ink">Lead information</h2>
            <form class="mt-4 grid gap-4 md:grid-cols-2" @submit.prevent="saveDetails">
              <div class="lf-field">
                <label class="lf-label" for="lead-name">Name</label>
                <input id="lead-name" v-model="form.name" required class="lf-control">
              </div>
              <div class="lf-field">
                <label class="lf-label" for="lead-source">Source</label>
                <select id="lead-source" v-model="form.source" class="lf-control">
                  <option value="">Select source</option>
                  <option v-for="source in leadSources" :key="source" :value="source">{{ leadSourceLabels[source] }}</option>
                </select>
              </div>
              <div class="lf-field">
                <label class="lf-label" for="lead-email">Email</label>
                <input id="lead-email" v-model="form.email" type="email" class="lf-control">
              </div>
              <div class="lf-field">
                <label class="lf-label" for="lead-phone">Phone</label>
                <input id="lead-phone" v-model="form.phone" class="lf-control">
              </div>
              <div class="lf-field md:col-span-2">
                <label class="lf-label" for="lead-service">Service</label>
                <select id="lead-service" v-model="form.service_id" class="lf-control">
                  <option value="">No service selected</option>
                  <option v-for="service in services" :key="service.id" :value="service.id">{{ service.name }}</option>
                </select>
              </div>
              <div class="lf-field md:col-span-2">
                <label class="lf-label" for="lead-message">Message</label>
                <textarea id="lead-message" v-model="form.message" rows="4" class="lf-control" />
              </div>
              <AppButton type="submit" :loading="saving">{{ saving ? 'Saving...' : 'Save details' }}</AppButton>
            </form>
          </section>

          <section class="rounded-[var(--radius-lf)] border border-lf-line bg-white p-5">
            <h2 class="text-sm font-semibold text-lf-ink">Notes</h2>
            <form class="mt-4" @submit.prevent="submitNote">
              <label class="lf-label" for="lead-note">Add a note</label>
              <textarea id="lead-note" v-model="noteBody" rows="3" required class="lf-control mt-1" placeholder="Add context for this lead" />
              <AppButton type="submit" class="mt-3" :loading="noting">{{ noting ? 'Adding...' : 'Add note' }}</AppButton>
            </form>
            <ul class="mt-4 divide-y divide-lf-line">
              <li v-for="note in lead.notes ?? []" :key="note.id" class="py-3">
                <p class="text-sm text-lf-ink">{{ note.body }}</p>
                <p class="mt-1 text-xs text-lf-muted">{{ note.user?.name ?? 'Unknown' }} · {{ formatDateTime(note.created_at) }}</p>
              </li>
              <li v-if="!(lead.notes ?? []).length" class="py-3 text-sm text-lf-muted">No notes yet.</li>
            </ul>
          </section>
        </div>

        <div class="space-y-5">
          <section class="rounded-[var(--radius-lf)] border border-lf-line bg-white p-5">
            <h2 class="text-sm font-semibold text-lf-ink">Assignment</h2>
            <p class="mt-2 text-sm text-lf-muted">{{ lead.assigned_user?.name ?? 'Unassigned' }}</p>
            <form v-if="canAssign" class="mt-4 space-y-3" @submit.prevent="saveAssignment">
              <select v-model="assignmentId" class="lf-control" aria-label="Assigned user">
                <option value="">Unassigned</option>
                <option v-for="user in assignees" :key="user.id" :value="user.id">{{ user.name }}</option>
              </select>
              <AppButton type="submit" variant="secondary" :loading="assigning">
                {{ assigning ? 'Assigning...' : 'Assign' }}
              </AppButton>
            </form>
          </section>

          <section class="rounded-[var(--radius-lf)] border border-lf-line bg-white p-5">
            <h2 class="text-sm font-semibold text-lf-ink">Pipeline</h2>
            <form class="mt-4 space-y-3" @submit.prevent="saveStage">
              <select v-model="stageId" class="lf-control" aria-label="Pipeline stage">
                <option v-for="stage in stageOptions" :key="stage.id" :value="stage.id">{{ stage.name }}</option>
              </select>
              <AppButton type="submit" variant="secondary" :loading="moving">
                {{ moving ? 'Moving...' : 'Move stage' }}
              </AppButton>
            </form>
          </section>

          <section class="rounded-[var(--radius-lf)] border border-lf-line bg-white p-5">
            <h2 class="text-sm font-semibold text-lf-ink">Activity</h2>
            <ol class="mt-4 space-y-3">
              <li v-for="activity in lead.activities ?? []" :key="activity.id" class="border-l-2 border-lf-accent/30 pl-3">
                <p class="text-sm text-lf-ink">{{ activity.description }}</p>
                <p class="text-xs text-lf-muted">{{ activity.user?.name ?? 'System' }} · {{ formatDateTime(activity.created_at) }}</p>
              </li>
              <li v-if="!(lead.activities ?? []).length" class="text-sm text-lf-muted">No activity yet.</li>
            </ol>
          </section>
        </div>
      </div>
    </template>

    <AppModal
      :open="confirmConvert"
      :title="convertSuccess ? 'Customer created' : 'Convert this lead to a customer?'"
      :description="convertSuccess ? 'The lead was successfully converted.' : 'This will create a customer record and mark the lead as Converted.'"
      :close-on-overlay="!converting"
      @close="closeConvert"
    >
      <div v-if="convertSuccess" class="flex flex-col items-center py-2 text-center">
        <CircleCheck class="lf-success-pop text-lf-success" :size="36" :stroke-width="1.75" />
        <p class="mt-3 text-sm text-lf-muted">You can open the new customer record now.</p>
      </div>
      <template #actions>
        <template v-if="convertSuccess">
          <AppButton variant="secondary" @click="closeConvert">Close</AppButton>
          <AppButton v-if="lead?.customer" @click="router.push(`/customers/${lead.customer.id}`)">
            View customer
          </AppButton>
        </template>
        <template v-else>
          <AppButton variant="secondary" :disabled="converting" @click="closeConvert">Cancel</AppButton>
          <AppButton :loading="converting" @click="confirmConversion">
            {{ converting ? 'Converting...' : 'Confirm convert' }}
          </AppButton>
        </template>
      </template>
    </AppModal>
  </section>
</template>

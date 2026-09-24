<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Plus } from 'lucide-vue-next'
import { createLead, getPipeline, listLeads } from '@/api/crm'
import { friendlyApiError } from '@/lib/errors'
import { useHighlight } from '@/lib/highlight'
import AppAvatar from '@/components/ui/AppAvatar.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppDrawer from '@/components/ui/AppDrawer.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import ErrorState from '@/components/ui/ErrorState.vue'
import FilterField from '@/components/ui/FilterField.vue'
import PageHeader from '@/components/ui/PageHeader.vue'
import PaginationBar from '@/components/ui/PaginationBar.vue'
import SearchInput from '@/components/ui/SearchInput.vue'
import SkeletonRows from '@/components/ui/SkeletonRows.vue'
import StageBadge from '@/components/ui/StageBadge.vue'
import http from '@/lib/http'
import { contactLine, formatDate } from '@/lib/format'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'
import type { ApiPaginated, Lead, LeadSource, PipelineStage, Service, User } from '@/types/api'
import { leadSourceLabels, leadSources } from '@/types/api'

const auth = useAuthStore()
const toast = useToastStore()
const route = useRoute()
const router = useRouter()
const highlight = useHighlight()
const canAssign = computed(
  () => auth.user?.role === 'administrator' || auth.user?.role === 'manager',
)

const leads = ref<Lead[]>([])
const stages = ref<PipelineStage[]>([])
const services = ref<Service[]>([])
const assignees = ref<User[]>([])
const meta = ref<ApiPaginated<Lead>['meta'] | null>(null)
const loading = ref(true)
const refreshing = ref(false)
const errorMessage = ref('')
const formError = ref('')
const showForm = ref(false)
const saving = ref(false)
const searchInput = ref('')
const filters = reactive({
  search: '',
  stage: '' as number | '',
  assigned_user: '' as number | '',
  service: '' as number | '',
  source: '' as LeadSource | '',
  page: 1,
})

const form = reactive({
  name: '',
  email: '',
  phone: '',
  source: '' as LeadSource | '',
  service_id: '' as number | '',
  assigned_user_id: '' as number | '',
  message: '',
})

let searchTimer: ReturnType<typeof setTimeout> | undefined

const empty = computed(() => !loading.value && !errorMessage.value && leads.value.length === 0)
const hasFilters = computed(
  () =>
    Boolean(filters.search || filters.stage || filters.assigned_user || filters.service || filters.source),
)

async function loadLeads(): Promise<void> {
  const isInitial = leads.value.length === 0
  if (isInitial) {
    loading.value = true
  } else {
    refreshing.value = true
  }
  errorMessage.value = ''

  try {
    const response = await listLeads({
      search: filters.search || undefined,
      stage: filters.stage,
      assigned_user: filters.assigned_user,
      service: filters.service,
      source: filters.source,
      page: filters.page,
    })
    leads.value = response.data
    meta.value = response.meta
  } catch (error) {
    errorMessage.value = friendlyApiError(error, 'Unable to load leads.')
    leads.value = []
    meta.value = null
  } finally {
    loading.value = false
    refreshing.value = false
  }
}

async function loadLookups(): Promise<void> {
  const [{ data: servicePage }, pipeline] = await Promise.all([
    http.get<ApiPaginated<Service>>('/api/v1/services'),
    getPipeline(),
  ])
  services.value = servicePage.data
  stages.value = pipeline.stages

  if (canAssign.value) {
    const { data } = await http.get<ApiPaginated<User>>('/api/v1/users?is_active=1')
    assignees.value = data.data.filter((user) => user.role === 'staff' || user.role === 'manager')
  }
}

function resetForm(): void {
  form.name = ''
  form.email = ''
  form.phone = ''
  form.source = ''
  form.service_id = ''
  form.assigned_user_id = ''
  form.message = ''
}

async function submitLead(): Promise<void> {
  formError.value = ''

  if (!form.email && !form.phone) {
    formError.value = 'Provide an email or phone number.'
    return
  }

  saving.value = true

  try {
    const created = await createLead({
      name: form.name,
      email: form.email || null,
      phone: form.phone || null,
      source: form.source || null,
      service_id: form.service_id || null,
      assigned_user_id: form.assigned_user_id || null,
      message: form.message || null,
    })
    resetForm()
    showForm.value = false
    toast.push('Lead created')

    if (filters.page === 1 && !hasFilters.value) {
      leads.value = [created, ...leads.value]
      if (meta.value) {
        meta.value = { ...meta.value, total: meta.value.total + 1 }
      }
      highlight.flash(created.id)
    } else {
      filters.page = 1
      await loadLeads()
      highlight.flash(created.id)
    }
  } catch (error) {
    formError.value = friendlyApiError(error, 'Unable to create lead.')
  } finally {
    saving.value = false
  }
}

function resetFilters(): void {
  filters.search = ''
  searchInput.value = ''
  filters.stage = ''
  filters.assigned_user = ''
  filters.service = ''
  filters.source = ''
  filters.page = 1
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
  () => [filters.search, filters.stage, filters.assigned_user, filters.service, filters.source, filters.page],
  () => {
    void loadLeads()
  },
)

watch(
  () => route.query.q,
  (value) => {
    if (typeof value === 'string') {
      searchInput.value = value
      filters.search = value
      filters.page = 1
    }
  },
  { immediate: true },
)

onMounted(() => {
  void loadLookups()
  if (leads.value.length === 0) {
    void loadLeads()
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
    <PageHeader title="Leads" description="Manage and track potential customers through your sales pipeline.">
      <template #actions>
        <AppButton @click="showForm = true">
          <Plus :size="16" :stroke-width="1.75" />
          New lead
        </AppButton>
      </template>
    </PageHeader>

    <div class="rounded-[var(--radius-lf)] border border-lf-line bg-white p-4">
      <p class="text-sm font-medium text-lf-ink">Filters</p>
      <div class="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <FilterField label="Search" for-id="lead-search" class="sm:col-span-2">
          <SearchInput id="lead-search" v-model="searchInput" placeholder="Search leads..." label="Search leads" />
        </FilterField>
        <FilterField label="Stage" for-id="lead-stage">
          <select id="lead-stage" v-model="filters.stage" class="lf-control" @change="filters.page = 1">
            <option value="">All stages</option>
            <option v-for="stage in stages" :key="stage.id" :value="stage.id">{{ stage.name }}</option>
          </select>
        </FilterField>
        <FilterField label="Source" for-id="lead-source">
          <select id="lead-source" v-model="filters.source" class="lf-control" @change="filters.page = 1">
            <option value="">All sources</option>
            <option v-for="source in leadSources" :key="source" :value="source">{{ leadSourceLabels[source] }}</option>
          </select>
        </FilterField>
        <FilterField label="Service" for-id="lead-service">
          <select id="lead-service" v-model="filters.service" class="lf-control" @change="filters.page = 1">
            <option value="">All services</option>
            <option v-for="service in services" :key="service.id" :value="service.id">{{ service.name }}</option>
          </select>
        </FilterField>
        <FilterField v-if="canAssign" label="Assignee" for-id="lead-assignee">
          <select id="lead-assignee" v-model="filters.assigned_user" class="lf-control" @change="filters.page = 1">
            <option value="">All assignees</option>
            <option v-for="user in assignees" :key="user.id" :value="user.id">{{ user.name }}</option>
          </select>
        </FilterField>
      </div>
      <div class="mt-3">
        <AppButton variant="ghost" @click="resetFilters">Clear</AppButton>
      </div>
    </div>

    <SkeletonRows v-if="loading" />
    <ErrorState v-else-if="errorMessage" title="Unable to load leads" :message="errorMessage" @retry="loadLeads" />
    <EmptyState
      v-else-if="empty"
      :title="hasFilters ? 'No matching leads' : 'No leads yet'"
      :description="hasFilters ? 'Try a different search or clear your filters.' : 'Capture inbound inquiries and move them through the pipeline.'"
    >
      <template #actions>
        <AppButton @click="showForm = true">New lead</AppButton>
      </template>
    </EmptyState>

    <div v-else class="lf-table-wrap">
      <table class="lf-table">
        <thead>
          <tr>
            <th>Lead</th>
            <th>Contact</th>
            <th>Service</th>
            <th>Stage</th>
            <th>Owner</th>
            <th>Created</th>
          </tr>
        </thead>
        <tbody v-if="refreshing">
          <tr v-for="row in 5" :key="row">
            <td colspan="6"><div class="skeleton h-8 w-full" /></td>
          </tr>
        </tbody>
        <tbody v-else>
          <tr
            v-for="lead in leads"
            :key="lead.id"
            class="cursor-pointer"
            :class="{ 'lf-highlight': highlight.has(lead.id) }"
            @click="router.push(`/leads/${lead.id}`)"
          >
            <td>
              <div class="flex items-center gap-3">
                <AppAvatar :name="lead.name" size="sm" />
                <div>
                  <p class="font-medium text-lf-ink">{{ lead.name }}</p>
                  <p class="text-xs text-lf-muted">{{ lead.source ? leadSourceLabels[lead.source] : 'No source' }}</p>
                </div>
              </div>
            </td>
            <td class="text-lf-muted">{{ contactLine(lead.email, lead.phone) }}</td>
            <td class="text-lf-muted">{{ lead.service?.name ?? '—' }}</td>
            <td>
              <StageBadge :name="lead.pipeline_stage?.name" :slug="lead.pipeline_stage?.slug" />
            </td>
            <td>
              <div class="flex items-center gap-2">
                <AppAvatar :name="lead.assigned_user?.name ?? 'Unassigned'" size="sm" />
                <span class="text-lf-muted">{{ lead.assigned_user?.name ?? 'Unassigned' }}</span>
              </div>
            </td>
            <td class="text-lf-muted">{{ formatDate(lead.created_at) }}</td>
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
      noun="leads"
      @change="filters.page = $event"
    />

    <AppDrawer
      :open="showForm"
      title="New lead"
      description="Create a qualification record. At least one contact method is required."
      @close="showForm = false"
    >
      <form class="space-y-4" @submit.prevent="submitLead">
        <div class="lf-field">
          <label class="lf-label" for="new-lead-name">Name</label>
          <input id="new-lead-name" v-model="form.name" required class="lf-control">
        </div>
        <div class="grid gap-4 sm:grid-cols-2">
          <div class="lf-field">
            <label class="lf-label" for="new-lead-email">Email</label>
            <input id="new-lead-email" v-model="form.email" type="email" class="lf-control">
          </div>
          <div class="lf-field">
            <label class="lf-label" for="new-lead-phone">Phone</label>
            <input id="new-lead-phone" v-model="form.phone" class="lf-control">
          </div>
        </div>
        <div class="grid gap-4 sm:grid-cols-2">
          <div class="lf-field">
            <label class="lf-label" for="new-lead-source">Source</label>
            <select id="new-lead-source" v-model="form.source" class="lf-control">
              <option value="">Select source</option>
              <option v-for="source in leadSources" :key="source" :value="source">{{ leadSourceLabels[source] }}</option>
            </select>
          </div>
          <div class="lf-field">
            <label class="lf-label" for="new-lead-service">Service</label>
            <select id="new-lead-service" v-model="form.service_id" class="lf-control">
              <option value="">No service selected</option>
              <option v-for="service in services" :key="service.id" :value="service.id">{{ service.name }}</option>
            </select>
          </div>
        </div>
        <div v-if="canAssign" class="lf-field">
          <label class="lf-label" for="new-lead-assignee">Assigned to</label>
          <select id="new-lead-assignee" v-model="form.assigned_user_id" class="lf-control">
            <option value="">Unassigned</option>
            <option v-for="user in assignees" :key="user.id" :value="user.id">{{ user.name }}</option>
          </select>
        </div>
        <div class="lf-field">
          <label class="lf-label" for="new-lead-message">Message</label>
          <textarea id="new-lead-message" v-model="form.message" rows="3" class="lf-control" />
        </div>
        <p v-if="formError" class="min-h-5 text-sm text-lf-danger">{{ formError }}</p>
        <div class="flex justify-end gap-2">
          <AppButton variant="secondary" type="button" @click="showForm = false">Cancel</AppButton>
          <AppButton type="submit" :loading="saving">{{ saving ? 'Creating...' : 'Create lead' }}</AppButton>
        </div>
      </form>
    </AppDrawer>
  </section>
</template>

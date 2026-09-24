<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Plus } from 'lucide-vue-next'
import { createCustomer, listCustomers } from '@/api/crm'
import { friendlyApiError } from '@/lib/errors'
import { useHighlight } from '@/lib/highlight'
import AppAvatar from '@/components/ui/AppAvatar.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppDrawer from '@/components/ui/AppDrawer.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import ErrorState from '@/components/ui/ErrorState.vue'
import FilterField from '@/components/ui/FilterField.vue'
import PageHeader from '@/components/ui/PageHeader.vue'
import PaginationBar from '@/components/ui/PaginationBar.vue'
import SearchInput from '@/components/ui/SearchInput.vue'
import SkeletonRows from '@/components/ui/SkeletonRows.vue'
import { contactLine, formatDate } from '@/lib/format'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'
import type { ApiPaginated, Customer, LeadSource } from '@/types/api'
import { leadSourceLabels, leadSources } from '@/types/api'

const auth = useAuthStore()
const toast = useToastStore()
const route = useRoute()
const router = useRouter()
const highlight = useHighlight()
const canCreate = computed(
  () => auth.user?.role === 'administrator' || auth.user?.role === 'manager',
)

const customers = ref<Customer[]>([])
const meta = ref<ApiPaginated<Customer>['meta'] | null>(null)
const loading = ref(true)
const refreshing = ref(false)
const errorMessage = ref('')
const formError = ref('')
const showForm = ref(false)
const saving = ref(false)
const searchInput = ref('')
const filters = reactive({
  search: '',
  source: '' as LeadSource | '',
  page: 1,
})

const form = reactive({
  name: '',
  email: '',
  phone: '',
  source: '' as LeadSource | '',
})

let searchTimer: ReturnType<typeof setTimeout> | undefined

const empty = computed(() => !loading.value && !errorMessage.value && customers.value.length === 0)
const hasFilters = computed(() => Boolean(filters.search || filters.source))

async function loadCustomers(): Promise<void> {
  const isInitial = customers.value.length === 0
  if (isInitial) {
    loading.value = true
  } else {
    refreshing.value = true
  }
  errorMessage.value = ''

  try {
    const response = await listCustomers({
      search: filters.search || undefined,
      source: filters.source,
      page: filters.page,
    })
    customers.value = response.data
    meta.value = response.meta
  } catch (error) {
    errorMessage.value = friendlyApiError(error, 'Unable to load customers.')
    customers.value = []
    meta.value = null
  } finally {
    loading.value = false
    refreshing.value = false
  }
}

function resetForm(): void {
  form.name = ''
  form.email = ''
  form.phone = ''
  form.source = ''
}

async function submitCustomer(): Promise<void> {
  formError.value = ''

  if (!form.email && !form.phone) {
    formError.value = 'Provide an email or phone number.'
    return
  }

  saving.value = true

  try {
    const created = await createCustomer({
      name: form.name,
      email: form.email || null,
      phone: form.phone || null,
      source: form.source || null,
    })
    resetForm()
    showForm.value = false
    toast.push('Customer created')

    if (filters.page === 1 && !hasFilters.value) {
      customers.value = [created, ...customers.value]
      if (meta.value) {
        meta.value = { ...meta.value, total: meta.value.total + 1 }
      }
      highlight.flash(created.id)
    } else {
      filters.page = 1
      await loadCustomers()
      highlight.flash(created.id)
    }
  } catch (error) {
    formError.value = friendlyApiError(error, 'Unable to create customer.')
  } finally {
    saving.value = false
  }
}

function resetFilters(): void {
  filters.search = ''
  searchInput.value = ''
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
  () => [filters.search, filters.source, filters.page],
  () => {
    void loadCustomers()
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
  if (customers.value.length === 0) {
    void loadCustomers()
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
    <PageHeader title="Customers" description="Manage converted customers and their relationship history.">
      <template v-if="canCreate" #actions>
        <AppButton @click="showForm = true">
          <Plus :size="16" :stroke-width="1.75" />
          New customer
        </AppButton>
      </template>
    </PageHeader>

    <div class="rounded-[var(--radius-lf)] border border-lf-line bg-white p-4">
      <p class="text-sm font-medium text-lf-ink">Filters</p>
      <div class="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <FilterField label="Search" for-id="customer-search" class="sm:col-span-2">
          <SearchInput
            id="customer-search"
            v-model="searchInput"
            placeholder="Search customers..."
            label="Search customers"
          />
        </FilterField>
        <FilterField label="Source" for-id="customer-source">
          <select id="customer-source" v-model="filters.source" class="lf-control" @change="filters.page = 1">
            <option value="">All sources</option>
            <option v-for="source in leadSources" :key="source" :value="source">{{ leadSourceLabels[source] }}</option>
          </select>
        </FilterField>
        <div class="flex items-end">
          <AppButton variant="ghost" @click="resetFilters">Clear</AppButton>
        </div>
      </div>
    </div>

    <SkeletonRows v-if="loading" />
    <ErrorState v-else-if="errorMessage" title="Unable to load customers" :message="errorMessage" @retry="loadCustomers" />
    <EmptyState
      v-else-if="empty"
      :title="hasFilters ? 'No matching customers' : 'No customers available'"
      :description="canCreate
        ? 'Customers created from converted leads or added directly will appear here.'
        : 'Customers from your assigned leads will appear here after conversion.'"
    >
      <template v-if="canCreate" #actions>
        <AppButton @click="showForm = true">Create customer</AppButton>
      </template>
    </EmptyState>

    <div v-else class="lf-table-wrap">
      <table class="lf-table">
        <thead>
          <tr>
            <th>Customer</th>
            <th>Contact</th>
            <th>Source</th>
            <th>Created</th>
          </tr>
        </thead>
        <tbody v-if="refreshing">
          <tr v-for="row in 4" :key="row">
            <td colspan="4"><div class="skeleton h-8 w-full" /></td>
          </tr>
        </tbody>
        <tbody v-else>
          <tr
            v-for="customer in customers"
            :key="customer.id"
            class="cursor-pointer"
            :class="{ 'lf-highlight': highlight.has(customer.id) }"
            @click="router.push(`/customers/${customer.id}`)"
          >
            <td>
              <div class="flex items-center gap-3">
                <AppAvatar :name="customer.name" size="sm" />
                <p class="font-medium text-lf-ink">{{ customer.name }}</p>
              </div>
            </td>
            <td class="text-lf-muted">{{ contactLine(customer.email, customer.phone) }}</td>
            <td>
              <AppBadge v-if="customer.source">{{ leadSourceLabels[customer.source] }}</AppBadge>
              <span v-else class="text-lf-muted">—</span>
            </td>
            <td class="text-lf-muted">{{ formatDate(customer.created_at) }}</td>
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
      noun="customers"
      @change="filters.page = $event"
    />

    <AppDrawer
      :open="showForm && canCreate"
      title="New customer"
      description="Add an established contact. At least one contact method is required."
      @close="showForm = false"
    >
      <form class="space-y-4" @submit.prevent="submitCustomer">
        <div class="lf-field">
          <label class="lf-label" for="new-customer-name">Name</label>
          <input id="new-customer-name" v-model="form.name" required class="lf-control">
        </div>
        <div class="lf-field">
          <label class="lf-label" for="new-customer-source">Source</label>
          <select id="new-customer-source" v-model="form.source" class="lf-control">
            <option value="">Select source</option>
            <option v-for="source in leadSources" :key="source" :value="source">{{ leadSourceLabels[source] }}</option>
          </select>
        </div>
        <div class="lf-field">
          <label class="lf-label" for="new-customer-email">Email</label>
          <input id="new-customer-email" v-model="form.email" type="email" class="lf-control">
        </div>
        <div class="lf-field">
          <label class="lf-label" for="new-customer-phone">Phone</label>
          <input id="new-customer-phone" v-model="form.phone" class="lf-control">
        </div>
        <p v-if="formError" class="min-h-5 text-sm text-lf-danger">{{ formError }}</p>
        <div class="flex justify-end gap-2">
          <AppButton variant="secondary" type="button" @click="showForm = false">Cancel</AppButton>
          <AppButton type="submit" :loading="saving">{{ saving ? 'Creating...' : 'Create customer' }}</AppButton>
        </div>
      </form>
    </AppDrawer>
  </section>
</template>

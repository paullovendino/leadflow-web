<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { Plus } from 'lucide-vue-next'
import { friendlyApiError } from '@/lib/errors'
import { useHighlight } from '@/lib/highlight'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppDrawer from '@/components/ui/AppDrawer.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import ErrorState from '@/components/ui/ErrorState.vue'
import PageHeader from '@/components/ui/PageHeader.vue'
import SkeletonRows from '@/components/ui/SkeletonRows.vue'
import http from '@/lib/http'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'
import type { ApiPaginated, ApiResource, Service } from '@/types/api'

const auth = useAuthStore()
const toast = useToastStore()
const highlight = useHighlight()
const services = ref<Service[]>([])
const loading = ref(true)
const errorMessage = ref('')
const formError = ref('')
const showForm = ref(false)
const saving = ref(false)
const busyId = ref<number | null>(null)
const canManage = computed(
  () => auth.user?.role === 'administrator' || auth.user?.role === 'manager',
)
const form = reactive({
  name: '',
  description: '',
  duration_minutes: 60,
})

async function loadServices(): Promise<void> {
  loading.value = true
  errorMessage.value = ''

  try {
    const { data } = await http.get<ApiPaginated<Service>>('/api/v1/services')
    services.value = data.data
  } catch (error) {
    errorMessage.value = friendlyApiError(error, 'Unable to load services.')
  } finally {
    loading.value = false
  }
}

function resetForm(): void {
  form.name = ''
  form.description = ''
  form.duration_minutes = 60
}

async function createService(): Promise<void> {
  formError.value = ''
  saving.value = true

  try {
    const { data } = await http.post<ApiResource<Service>>('/api/v1/services', form)
    resetForm()
    showForm.value = false
    services.value = [data.data, ...services.value]
    highlight.flash(data.data.id)
    toast.push('Service created')
  } catch (error) {
    formError.value = friendlyApiError(error, 'Unable to create service.')
  } finally {
    saving.value = false
  }
}

async function toggleActive(service: Service): Promise<void> {
  busyId.value = service.id

  try {
    const path = service.is_active ? 'deactivate' : 'activate'
    const { data } = await http.post<ApiResource<Service>>(`/api/v1/services/${service.id}/${path}`)
    services.value = services.value.map((item) => (item.id === service.id ? data.data : item))
    highlight.flash(service.id)
    toast.push(service.is_active ? 'Service deactivated' : 'Service activated')
  } catch (error) {
    toast.push(friendlyApiError(error, 'Unable to update service.'), 'error')
  } finally {
    busyId.value = null
  }
}

onMounted(() => {
  void loadServices()
})
</script>

<template>
  <section class="lf-page">
    <PageHeader title="Services" description="Manage the services available to your customers.">
      <template v-if="canManage" #actions>
        <AppButton @click="showForm = true">
          <Plus :size="16" :stroke-width="1.75" />
          Add service
        </AppButton>
      </template>
    </PageHeader>

    <SkeletonRows v-if="loading" />
    <ErrorState v-else-if="errorMessage" title="Unable to load services" :message="errorMessage" @retry="loadServices" />
    <EmptyState v-else-if="services.length === 0" title="No services yet" description="Add a bookable offering to get started." />

    <div v-else class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <article
        v-for="service in services"
        :key="service.id"
        class="rounded-[var(--radius-lf)] border border-lf-line bg-white p-5 transition hover:border-lf-accent/40"
        :class="{ 'lf-highlight': highlight.has(service.id) }"
      >
        <div class="flex items-start justify-between gap-3">
          <div>
            <h2 class="font-semibold text-lf-ink">{{ service.name }}</h2>
            <p class="mt-1 text-sm text-lf-muted">{{ service.duration_minutes }} minutes</p>
          </div>
          <AppBadge :tone="service.is_active ? 'success' : 'neutral'">
            {{ service.is_active ? 'Active' : 'Inactive' }}
          </AppBadge>
        </div>
        <p v-if="service.description" class="mt-3 text-sm text-lf-muted">{{ service.description }}</p>
        <div v-if="canManage" class="mt-4">
          <AppButton
            :variant="service.is_active ? 'danger' : 'secondary'"
            :loading="busyId === service.id"
            @click="toggleActive(service)"
          >
            {{ service.is_active ? 'Deactivate' : 'Activate' }}
          </AppButton>
        </div>
      </article>
    </div>

    <AppDrawer
      :open="showForm && canManage"
      title="Add service"
      description="Inactive services remain in the catalog for later appointment history."
      @close="showForm = false"
    >
      <form class="space-y-4" @submit.prevent="createService">
        <div class="lf-field">
          <label class="lf-label" for="service-name">Name</label>
          <input id="service-name" v-model="form.name" required class="lf-control">
        </div>
        <div class="lf-field">
          <label class="lf-label" for="service-duration">Duration (minutes)</label>
          <input id="service-duration" v-model.number="form.duration_minutes" type="number" min="1" required class="lf-control">
        </div>
        <div class="lf-field">
          <label class="lf-label" for="service-description">Description</label>
          <input id="service-description" v-model="form.description" class="lf-control">
        </div>
        <p v-if="formError" class="min-h-5 text-sm text-lf-danger">{{ formError }}</p>
        <div class="flex justify-end gap-2">
          <AppButton variant="secondary" type="button" @click="showForm = false">Cancel</AppButton>
          <AppButton type="submit" :loading="saving">{{ saving ? 'Creating...' : 'Create service' }}</AppButton>
        </div>
      </form>
    </AppDrawer>
  </section>
</template>

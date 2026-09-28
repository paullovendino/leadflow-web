<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { getDashboard } from '@/api/crm'
import { friendlyApiError } from '@/lib/errors'
import AppAvatar from '@/components/ui/AppAvatar.vue'
import ErrorState from '@/components/ui/ErrorState.vue'
import PageHeader from '@/components/ui/PageHeader.vue'
import PipelineBars from '@/components/ui/PipelineBars.vue'
import StageBadge from '@/components/ui/StageBadge.vue'
import { contactLine, firstName, formatDateTime, greeting } from '@/lib/format'
import { useAuthStore } from '@/stores/auth'
import type { Dashboard } from '@/types/api'
import { appointmentStatusLabels, leadSourceLabels } from '@/types/api'

const auth = useAuthStore()
const loading = ref(true)
const errorMessage = ref('')
const dashboard = ref<Dashboard | null>(null)

const first = computed(() => firstName(auth.user?.name))
const pipelineItems = computed(() =>
  (dashboard.value?.pipeline ?? []).map((item) => ({ label: item.name, count: item.count })),
)
const sourceItems = computed(() =>
  (dashboard.value?.lead_sources ?? []).map((item) => ({
    label: item.source ? leadSourceLabels[item.source] : 'Not set',
    count: item.count,
  })),
)
const appointmentCards = computed(() => {
  const metrics = dashboard.value?.appointments
  if (!metrics) {
    return []
  }

  return [
    { label: 'Today', value: metrics.today, hint: 'Scheduled for today' },
    { label: 'Upcoming', value: metrics.upcoming, hint: 'Still on the calendar' },
    { label: 'Scheduled', value: metrics.scheduled, hint: appointmentStatusLabels.scheduled },
    { label: 'Confirmed', value: metrics.confirmed, hint: appointmentStatusLabels.confirmed },
    { label: 'Completed', value: metrics.completed, hint: appointmentStatusLabels.completed },
    { label: 'Cancelled', value: metrics.cancelled, hint: appointmentStatusLabels.cancelled },
    { label: 'No-show', value: metrics.no_show, hint: appointmentStatusLabels.no_show },
  ]
})

function subjectTo(activity: Dashboard['recent_activity'][number]): string | null {
  if (!activity.subject) {
    return null
  }

  if (activity.subject.type === 'lead') {
    return `/admin/leads/${activity.subject.id}`
  }

  if (activity.subject.type === 'customer') {
    return `/admin/customers/${activity.subject.id}`
  }

  return `/admin/appointments/${activity.subject.id}`
}

async function load(): Promise<void> {
  loading.value = true
  errorMessage.value = ''

  try {
    dashboard.value = await getDashboard()
  } catch (error) {
    errorMessage.value = friendlyApiError(error, 'Unable to load the dashboard.')
    dashboard.value = null
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  void load()
})
</script>

<template>
  <section class="lf-page">
    <PageHeader
      :title="`${greeting()}, ${first}`"
      description="Operational snapshot of the leads, customers, and appointments you can access."
    />

    <ErrorState v-if="errorMessage && !loading" title="Unable to load the dashboard" :message="errorMessage" @retry="load" />

    <template v-else-if="loading">
      <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div v-for="card in 4" :key="card" class="rounded-[var(--radius-lf)] border border-lf-line bg-white p-4">
          <div class="skeleton h-3 w-20" />
          <div class="skeleton mt-4 h-8 w-16" />
          <div class="skeleton mt-3 h-3 w-32" />
        </div>
      </div>
      <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div v-for="card in 7" :key="card" class="rounded-[var(--radius-lf)] border border-lf-line bg-white p-4">
          <div class="skeleton h-3 w-16" />
          <div class="skeleton mt-3 h-7 w-10" />
        </div>
      </div>
      <div class="rounded-[var(--radius-lf)] border border-lf-line bg-white p-5">
        <div class="skeleton h-4 w-40" />
        <div class="mt-4 space-y-3">
          <div v-for="row in 4" :key="row" class="skeleton h-2 w-full" />
        </div>
      </div>
    </template>

    <template v-else-if="dashboard">
      <div class="lf-stagger grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <article class="rounded-[var(--radius-lf)] border border-lf-line bg-white p-4">
          <p class="text-xs font-semibold tracking-wide text-lf-muted uppercase">Total leads</p>
          <p class="mt-3 text-3xl font-semibold text-lf-ink">{{ dashboard.overview.total_leads }}</p>
          <p class="mt-1 text-xs text-lf-muted">Accessible in your workspace</p>
        </article>
        <article class="rounded-[var(--radius-lf)] border border-lf-line bg-white p-4">
          <p class="text-xs font-semibold tracking-wide text-lf-muted uppercase">Qualified</p>
          <p class="mt-3 text-3xl font-semibold text-lf-ink">{{ dashboard.overview.qualified_leads }}</p>
          <p class="mt-1 text-xs text-lf-muted">Currently in the Qualified stage</p>
        </article>
        <article class="rounded-[var(--radius-lf)] border border-lf-line bg-white p-4">
          <p class="text-xs font-semibold tracking-wide text-lf-muted uppercase">Converted</p>
          <p class="mt-3 text-3xl font-semibold text-lf-ink">{{ dashboard.overview.converted_leads }}</p>
          <p class="mt-1 text-xs text-lf-muted">Currently in the Converted stage</p>
        </article>
        <article class="rounded-[var(--radius-lf)] border border-lf-line bg-white p-4">
          <p class="text-xs font-semibold tracking-wide text-lf-muted uppercase">Customers</p>
          <p class="mt-3 text-3xl font-semibold text-lf-ink">{{ dashboard.overview.total_customers }}</p>
          <p class="mt-1 text-xs text-lf-muted">Established records</p>
        </article>
      </div>

      <section>
        <h2 class="text-sm font-semibold text-lf-ink">Appointments</h2>
        <p class="mt-1 text-xs text-lf-muted">Today uses the application timezone. Upcoming excludes completed, cancelled, and no-show.</p>
        <div class="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <article
            v-for="card in appointmentCards"
            :key="card.label"
            class="rounded-[var(--radius-lf)] border border-lf-line bg-white p-4"
          >
            <p class="text-xs font-semibold tracking-wide text-lf-muted uppercase">{{ card.label }}</p>
            <p class="mt-2 text-2xl font-semibold text-lf-ink">{{ card.value }}</p>
            <p class="mt-1 text-xs text-lf-muted">{{ card.hint }}</p>
          </article>
        </div>
      </section>

      <div class="grid gap-4 xl:grid-cols-2">
        <section class="rounded-[var(--radius-lf)] border border-lf-line bg-white p-5">
          <h2 class="text-sm font-semibold text-lf-ink">Lead pipeline</h2>
          <p class="mt-1 text-xs text-lf-muted">Current occupancy of each active stage.</p>
          <div class="mt-4">
            <PipelineBars
              :items="pipelineItems"
              empty-title="No pipeline stages"
              empty-description="Active stages will appear here once a default pipeline is configured."
            />
          </div>
        </section>
        <section class="rounded-[var(--radius-lf)] border border-lf-line bg-white p-5">
          <h2 class="text-sm font-semibold text-lf-ink">Lead sources</h2>
          <p class="mt-1 text-xs text-lf-muted">How accessible leads entered the pipeline.</p>
          <div class="mt-4">
            <PipelineBars
              :items="sourceItems"
              empty-title="No lead sources"
              empty-description="Source distribution will appear when leads are captured."
            />
          </div>
        </section>
      </div>

      <div class="grid gap-4 xl:grid-cols-3">
        <section class="xl:col-span-2 rounded-[var(--radius-lf)] border border-lf-line bg-white">
          <div class="flex items-center justify-between border-b border-lf-line px-5 py-4">
            <h2 class="text-sm font-semibold text-lf-ink">Recent leads</h2>
            <RouterLink to="/admin/leads" class="text-sm text-lf-accent hover:underline">View all</RouterLink>
          </div>
          <div v-if="dashboard.recent_leads.length === 0" class="px-5 py-8 text-sm text-lf-muted">No leads yet.</div>
          <div v-else class="overflow-x-auto">
            <table class="lf-table min-w-[520px]">
              <thead>
                <tr>
                  <th>Lead</th>
                  <th>Service</th>
                  <th>Stage</th>
                  <th>Owner</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="lead in dashboard.recent_leads" :key="lead.id">
                  <td>
                    <RouterLink :to="`/admin/leads/${lead.id}`" class="font-medium text-lf-ink hover:text-lf-accent">
                      {{ lead.name }}
                    </RouterLink>
                    <p class="text-xs text-lf-muted">{{ contactLine(lead.email, lead.phone) }}</p>
                  </td>
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
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section class="rounded-[var(--radius-lf)] border border-lf-line bg-white">
          <div class="border-b border-lf-line px-5 py-4">
            <h2 class="text-sm font-semibold text-lf-ink">Recent activity</h2>
            <p class="mt-1 text-xs text-lf-muted">Leads, customers, and appointments you can view</p>
          </div>
          <ol v-if="dashboard.recent_activity.length" class="space-y-3 px-5 py-4">
            <li v-for="activity in dashboard.recent_activity" :key="activity.id" class="border-l-2 border-lf-accent/30 pl-3">
              <p class="text-sm text-lf-ink">{{ activity.description }}</p>
              <p class="text-xs text-lf-muted">
                <RouterLink
                  v-if="subjectTo(activity)"
                  :to="subjectTo(activity)!"
                  class="hover:text-lf-accent hover:underline"
                >
                  {{ activity.subject?.name }}
                </RouterLink>
                <span v-else>{{ activity.subject?.name ?? 'Record' }}</span>
                · {{ formatDateTime(activity.created_at) }}
              </p>
            </li>
          </ol>
          <p v-else class="px-5 py-8 text-sm text-lf-muted">No recent activity to show.</p>
        </section>
      </div>
    </template>
  </section>
</template>

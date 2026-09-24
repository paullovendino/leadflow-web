<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { getLead, getPipeline, listCustomers, listLeads } from '@/api/crm'
import { friendlyApiError } from '@/lib/errors'
import AppAvatar from '@/components/ui/AppAvatar.vue'
import ErrorState from '@/components/ui/ErrorState.vue'
import PageHeader from '@/components/ui/PageHeader.vue'
import PipelineBars from '@/components/ui/PipelineBars.vue'
import StageBadge from '@/components/ui/StageBadge.vue'
import { contactLine, firstName, formatDateTime, greeting } from '@/lib/format'
import { useAuthStore } from '@/stores/auth'
import type { Activity, Lead, PipelineStage } from '@/types/api'

const auth = useAuthStore()
const loading = ref(true)
const errorMessage = ref('')
const chartError = ref('')
const totalLeads = ref(0)
const qualifiedCount = ref<number | null>(null)
const convertedCount = ref<number | null>(null)
const customerCount = ref(0)
const recentLeads = ref<Lead[]>([])
const stageCounts = ref<Array<{ stage: PipelineStage; count: number }>>([])
const recentActivities = ref<Array<Activity & { subject: string }>>([])

const first = computed(() => firstName(auth.user?.name))
const chartItems = computed(() =>
  stageCounts.value.map((item) => ({ label: item.stage.name, count: item.count })),
)

async function load(): Promise<void> {
  loading.value = true
  errorMessage.value = ''
  chartError.value = ''

  try {
    const [pipeline, leadsPage, customersPage] = await Promise.all([
      getPipeline(),
      listLeads({ per_page: 8 }),
      listCustomers({ per_page: 1 }),
    ])

    recentLeads.value = leadsPage.data
    totalLeads.value = leadsPage.meta.total
    customerCount.value = customersPage.meta.total

    const featuredSlugs = ['new', 'contacted', 'qualified', 'converted']
    const featured = pipeline.stages.filter((stage) => featuredSlugs.includes(stage.slug))

    try {
      const counts = await Promise.all(
        featured.map(async (stage) => {
          const page = await listLeads({ stage: stage.id, per_page: 1 })
          return { stage, count: page.meta.total }
        }),
      )

      stageCounts.value = counts
      qualifiedCount.value = counts.find((item) => item.stage.slug === 'qualified')?.count ?? null
      convertedCount.value = counts.find((item) => item.stage.slug === 'converted')?.count ?? null
    } catch (error) {
      chartError.value = friendlyApiError(error, 'Unable to load pipeline overview.')
      stageCounts.value = []
    }

    const details = await Promise.all(leadsPage.data.slice(0, 3).map((lead) => getLead(lead.id)))
    recentActivities.value = details
      .flatMap((lead) => (lead.activities ?? []).map((activity) => ({ ...activity, subject: lead.name })))
      .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))
      .slice(0, 6)
  } catch (error) {
    errorMessage.value = friendlyApiError(error, 'Unable to load the dashboard.')
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
      description="Here’s what’s happening with the leads and customers you can access."
    />

    <ErrorState v-if="errorMessage && !loading" :message="errorMessage" @retry="load" />

    <template v-else-if="loading">
      <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div v-for="card in 4" :key="card" class="rounded-[var(--radius-lf)] border border-lf-line bg-white p-4">
          <div class="skeleton h-3 w-20" />
          <div class="skeleton mt-4 h-8 w-16" />
          <div class="skeleton mt-3 h-3 w-32" />
        </div>
      </div>
      <div class="rounded-[var(--radius-lf)] border border-lf-line bg-white p-5">
        <div class="skeleton h-4 w-40" />
        <div class="mt-4 space-y-3">
          <div v-for="row in 4" :key="row" class="skeleton h-2 w-full" />
        </div>
      </div>
    </template>

    <template v-else>
      <div class="lf-stagger grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <article class="rounded-[var(--radius-lf)] border border-lf-line bg-white p-4 transition hover:border-lf-accent/40">
          <p class="text-xs font-semibold tracking-wide text-lf-muted uppercase">Total leads</p>
          <p class="mt-3 text-3xl font-semibold text-lf-ink">{{ totalLeads }}</p>
          <p class="mt-1 text-xs text-lf-muted">Accessible in your workspace</p>
        </article>
        <article class="rounded-[var(--radius-lf)] border border-lf-line bg-white p-4 transition hover:border-lf-accent/40">
          <p class="text-xs font-semibold tracking-wide text-lf-muted uppercase">Qualified</p>
          <p class="mt-3 text-3xl font-semibold text-lf-ink">{{ qualifiedCount ?? '—' }}</p>
          <p class="mt-1 text-xs text-lf-muted">Currently in Qualified</p>
        </article>
        <article class="rounded-[var(--radius-lf)] border border-lf-line bg-white p-4 transition hover:border-lf-accent/40">
          <p class="text-xs font-semibold tracking-wide text-lf-muted uppercase">Converted</p>
          <p class="mt-3 text-3xl font-semibold text-lf-ink">{{ convertedCount ?? '—' }}</p>
          <p class="mt-1 text-xs text-lf-muted">Reached Converted</p>
        </article>
        <article class="rounded-[var(--radius-lf)] border border-lf-line bg-white p-4 transition hover:border-lf-accent/40">
          <p class="text-xs font-semibold tracking-wide text-lf-muted uppercase">Customers</p>
          <p class="mt-3 text-3xl font-semibold text-lf-ink">{{ customerCount }}</p>
          <p class="mt-1 text-xs text-lf-muted">Established records</p>
        </article>
      </div>

      <section class="rounded-[var(--radius-lf)] border border-lf-line bg-white p-5">
        <h2 class="text-sm font-semibold text-lf-ink">Pipeline overview</h2>
        <p class="mt-1 text-xs text-lf-muted">Counts use existing paginated totals for key stages.</p>
        <div class="mt-4">
          <ErrorState
            v-if="chartError"
            title="Unable to load pipeline overview"
            :message="chartError"
            @retry="load"
          />
          <PipelineBars v-else :items="chartItems" />
        </div>
      </section>

      <div class="grid gap-4 xl:grid-cols-3">
        <section class="xl:col-span-2 rounded-[var(--radius-lf)] border border-lf-line bg-white">
          <div class="flex items-center justify-between border-b border-lf-line px-5 py-4">
            <h2 class="text-sm font-semibold text-lf-ink">Recent leads</h2>
            <RouterLink to="/leads" class="text-sm text-lf-accent hover:underline">View all</RouterLink>
          </div>
          <div v-if="recentLeads.length === 0" class="px-5 py-8 text-sm text-lf-muted">No leads yet.</div>
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
                <tr v-for="lead in recentLeads" :key="lead.id">
                  <td>
                    <RouterLink :to="`/leads/${lead.id}`" class="font-medium text-lf-ink hover:text-lf-accent">
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
            <p class="mt-1 text-xs text-lf-muted">From the latest accessible leads</p>
          </div>
          <ol v-if="recentActivities.length" class="space-y-3 px-5 py-4">
            <li v-for="activity in recentActivities" :key="activity.id" class="border-l-2 border-lf-accent/30 pl-3">
              <p class="text-sm text-lf-ink">{{ activity.description }}</p>
              <p class="text-xs text-lf-muted">{{ activity.subject }} · {{ formatDateTime(activity.created_at) }}</p>
            </li>
          </ol>
          <p v-else class="px-5 py-8 text-sm text-lf-muted">No recent activity to show.</p>
        </section>
      </div>
    </template>
  </section>
</template>

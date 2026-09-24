<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  activatePipelineStage,
  deactivatePipelineStage,
  getPipeline,
  listLeads,
  moveLead,
  updatePipelineStage,
} from '@/api/crm'
import { friendlyApiError } from '@/lib/errors'
import { useHighlight } from '@/lib/highlight'
import AppAvatar from '@/components/ui/AppAvatar.vue'
import AppButton from '@/components/ui/AppButton.vue'
import ErrorState from '@/components/ui/ErrorState.vue'
import PageHeader from '@/components/ui/PageHeader.vue'
import SkeletonRows from '@/components/ui/SkeletonRows.vue'
import { contactLine } from '@/lib/format'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'
import type { Lead, Pipeline, PipelineStage } from '@/types/api'

const auth = useAuthStore()
const toast = useToastStore()
const router = useRouter()
const highlight = useHighlight()

const pipeline = ref<Pipeline | null>(null)
const leads = ref<Lead[]>([])
const loading = ref(true)
const errorMessage = ref('')
const actionError = ref('')
const stageNameEdits = ref<Record<number, string>>({})
const stagePositionEdits = ref<Record<number, number>>({})
const busyLeadId = ref<number | null>(null)
const busyStageId = ref<number | null>(null)

const canManageStages = computed(
  () => auth.user?.role === 'administrator' || auth.user?.role === 'manager',
)

const columns = computed(() => pipeline.value?.stages ?? [])

function leadsForStage(stageId: number): Lead[] {
  return leads.value.filter((lead) => lead.pipeline_stage?.id === stageId)
}

function applyStage(updated: PipelineStage): void {
  if (!pipeline.value) {
    return
  }

  pipeline.value = {
    ...pipeline.value,
    stages: pipeline.value.stages
      .map((stage) => (stage.id === updated.id ? { ...stage, ...updated } : stage))
      .sort((a, b) => a.position - b.position),
  }
}

async function load(): Promise<void> {
  loading.value = true
  errorMessage.value = ''

  try {
    const [nextPipeline, leadPage] = await Promise.all([getPipeline(), listLeads({ per_page: 100 })])
    pipeline.value = nextPipeline
    leads.value = leadPage.data
    stageNameEdits.value = Object.fromEntries(nextPipeline.stages.map((stage) => [stage.id, stage.name]))
    stagePositionEdits.value = Object.fromEntries(nextPipeline.stages.map((stage) => [stage.id, stage.position]))
  } catch (error) {
    errorMessage.value = friendlyApiError(error, 'Unable to load the pipeline.')
    pipeline.value = null
    leads.value = []
  } finally {
    loading.value = false
  }
}

async function changeStage(lead: Lead, event: Event): Promise<void> {
  const select = event.target as HTMLSelectElement
  const nextStageId = Number(select.value)

  if (!nextStageId || nextStageId === lead.pipeline_stage?.id) {
    return
  }

  actionError.value = ''
  busyLeadId.value = lead.id

  try {
    const updated = await moveLead(lead.id, nextStageId)
    const stage = columns.value.find((item) => item.id === nextStageId)
    leads.value = leads.value.map((item) =>
      item.id === lead.id
        ? { ...item, ...updated, pipeline_stage: updated.pipeline_stage ?? stage ?? item.pipeline_stage }
        : item,
    )
    highlight.flash(lead.id)
    toast.push('Lead stage updated')
  } catch (error) {
    actionError.value = friendlyApiError(error, 'Unable to move this lead.')
    select.value = String(lead.pipeline_stage?.id ?? '')
  } finally {
    busyLeadId.value = null
  }
}

async function saveStage(stage: PipelineStage): Promise<void> {
  actionError.value = ''
  busyStageId.value = stage.id

  try {
    applyStage(await updatePipelineStage(stage.id, {
      name: stageNameEdits.value[stage.id],
      position: Number(stagePositionEdits.value[stage.id]),
    }))
    toast.push('Pipeline stage updated')
  } catch (error) {
    actionError.value = friendlyApiError(error, 'Unable to update this stage.')
  } finally {
    busyStageId.value = null
  }
}

async function toggleStage(stage: PipelineStage): Promise<void> {
  actionError.value = ''
  busyStageId.value = stage.id

  try {
    const updated = stage.is_active
      ? await deactivatePipelineStage(stage.id)
      : await activatePipelineStage(stage.id)
    applyStage(updated)
    toast.push(stage.is_active ? 'Stage deactivated' : 'Stage activated')
  } catch (error) {
    actionError.value = friendlyApiError(error, 'Unable to update stage status.')
  } finally {
    busyStageId.value = null
  }
}

onMounted(() => {
  void load()
})
</script>

<template>
  <section class="lf-page">
    <PageHeader
      title="Pipeline"
      :description="pipeline?.name ?? 'Move leads through the sales process without leaving the board.'"
    />

    <p v-if="actionError" class="min-h-5 text-sm text-lf-danger">{{ actionError }}</p>
    <SkeletonRows v-if="loading" :rows="4" />
    <ErrorState v-else-if="errorMessage" title="Unable to load the pipeline" :message="errorMessage" @retry="load" />

    <div v-else class="-mx-4 overflow-x-auto px-4 pb-2 lg:-mx-8 lg:px-8">
      <div class="flex min-w-max gap-4">
        <article
          v-for="stage in columns"
          :key="stage.id"
          class="w-72 shrink-0 rounded-[var(--radius-lf)] border border-lf-line bg-lf-soft/70 p-3"
        >
          <div class="mb-3">
            <div class="flex items-center justify-between gap-2">
              <h2 class="text-sm font-semibold text-lf-ink">{{ stage.name }}</h2>
              <span class="text-xs text-lf-muted">{{ leadsForStage(stage.id).length }}</span>
            </div>
            <p class="text-xs text-lf-muted">{{ leadsForStage(stage.id).length }} leads</p>
            <p v-if="!stage.is_active" class="mt-1 text-xs text-lf-warning">Inactive</p>
          </div>
          <TransitionGroup name="lf-card" tag="div" class="space-y-2">
            <article
              v-for="lead in leadsForStage(stage.id)"
              :key="lead.id"
              class="rounded-lg border border-lf-line bg-white p-3 transition hover:border-lf-accent/40"
              :class="{ 'lf-highlight': highlight.has(lead.id) }"
            >
              <button type="button" class="w-full text-left" @click="router.push(`/leads/${lead.id}`)">
                <p class="font-medium text-lf-ink">{{ lead.name }}</p>
                <p class="mt-1 text-xs text-lf-muted">{{ lead.service?.name ?? 'No service' }}</p>
                <p class="mt-1 text-xs text-lf-muted">{{ contactLine(lead.email, lead.phone) }}</p>
                <div class="mt-2 flex items-center gap-2">
                  <AppAvatar :name="lead.assigned_user?.name ?? 'Unassigned'" size="sm" />
                  <span class="text-xs text-lf-muted">{{ lead.assigned_user?.name ?? 'Unassigned' }}</span>
                </div>
              </button>
              <label class="sr-only" :for="`stage-${lead.id}`">Move {{ lead.name }}</label>
              <select
                :id="`stage-${lead.id}`"
                class="lf-control mt-2 text-xs"
                :value="lead.pipeline_stage?.id"
                :disabled="busyLeadId === lead.id"
                @change="changeStage(lead, $event)"
              >
                <option
                  v-for="option in columns.filter((item) => item.is_active || item.id === lead.pipeline_stage?.id)"
                  :key="option.id"
                  :value="option.id"
                >
                  {{ option.name }}
                </option>
              </select>
            </article>
            <p
              v-if="leadsForStage(stage.id).length === 0"
              :key="`empty-${stage.id}`"
              class="rounded-lg border border-dashed border-lf-line px-3 py-8 text-center text-xs text-lf-muted"
            >
              No leads
            </p>
          </TransitionGroup>
        </article>
      </div>
    </div>

    <section v-if="canManageStages && pipeline && !loading" class="rounded-[var(--radius-lf)] border border-lf-line bg-white p-5">
      <h2 class="text-sm font-semibold text-lf-ink">Stage management</h2>
      <p class="mt-1 text-sm text-lf-muted">
        Rename, reorder, or deactivate stages. Deactivate instead of deleting stages that already have leads.
      </p>
      <ul class="mt-4 divide-y divide-lf-line">
        <li v-for="stage in pipeline.stages" :key="stage.id" class="flex flex-wrap items-center gap-3 py-3">
          <input v-model="stageNameEdits[stage.id]" aria-label="Stage name" class="lf-control min-w-40 flex-1">
          <input
            v-model.number="stagePositionEdits[stage.id]"
            type="number"
            min="1"
            aria-label="Stage position"
            class="lf-control w-20"
          >
          <AppButton variant="secondary" :loading="busyStageId === stage.id" @click="saveStage(stage)">Save</AppButton>
          <AppButton variant="danger" :loading="busyStageId === stage.id" @click="toggleStage(stage)">
            {{ stage.is_active ? 'Deactivate' : 'Activate' }}
          </AppButton>
        </li>
      </ul>
    </section>
  </section>
</template>

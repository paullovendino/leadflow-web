<script setup lang="ts">
import { ref, watch } from 'vue'
import { qualifyLead, type QualifyLeadResult } from '@/api/crm'
import AppButton from '@/components/ui/AppButton.vue'
import AppModal from '@/components/ui/AppModal.vue'
import { friendlyApiError } from '@/lib/errors'

const props = defineProps<{
  open: boolean
  leadId: number | null
}>()

const emit = defineEmits<{
  close: []
  qualified: [QualifyLeadResult]
}>()

const submitting = ref(false)
const errorMessage = ref('')

watch(
  () => props.open,
  (open) => {
    if (open) {
      errorMessage.value = ''
    }
  },
)

function close(): void {
  if (submitting.value) {
    return
  }

  emit('close')
}

async function confirm(): Promise<void> {
  if (!props.leadId || submitting.value) {
    return
  }

  errorMessage.value = ''
  submitting.value = true

  try {
    emit('qualified', await qualifyLead(props.leadId))
  } catch (error) {
    errorMessage.value = friendlyApiError(error, 'Unable to qualify this lead.')
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <AppModal
    :open="open"
    title="Qualify this lead?"
    description="This will mark the lead as qualified and add them to your customer list. If an existing customer matches their email or phone number, LeadFlow will link the lead to that customer instead."
    :close-on-overlay="!submitting"
    @close="close"
  >
    <p v-if="errorMessage" class="text-sm text-lf-danger">{{ errorMessage }}</p>
    <template #actions>
      <AppButton variant="secondary" :disabled="submitting" @click="close">Cancel</AppButton>
      <AppButton :loading="submitting" @click="confirm">
        {{ submitting ? 'Qualifying...' : 'Qualify lead' }}
      </AppButton>
    </template>
  </AppModal>
</template>

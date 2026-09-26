<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import axios from 'axios'
import { ArrowRight, CircleAlert, CircleCheck } from 'lucide-vue-next'
import { createPublicLead } from '@/api/public'
import AppButton from '@/components/ui/AppButton.vue'
import { fieldErrors } from '@/lib/errors'
import type { PublicService } from '@/types/api'

const props = defineProps<{
  services: PublicService[]
  preferredServiceId?: number | null
}>()

const form = reactive({
  name: '',
  email: '',
  phone: '',
  service_id: '' as number | '',
  message: '',
  company: '',
})

const localErrors = reactive<Record<string, string>>({})
const formError = ref('')
const sending = ref(false)
const submittedName = ref('')
const success = ref(false)

const firstName = computed(() => submittedName.value.trim().split(/\s+/)[0] || 'there')

watch(
  () => props.preferredServiceId,
  (id) => {
    if (id) {
      form.service_id = id
    }
  },
  { immediate: true },
)

function clearField(field: string): void {
  delete localErrors[field]
}

function validate(): boolean {
  Object.keys(localErrors).forEach((key) => delete localErrors[key])
  formError.value = ''

  if (!form.name.trim()) {
    localErrors.name = 'Please enter your name.'
  }

  if (!form.email.trim() && !form.phone.trim()) {
    localErrors.email = 'Add an email or phone number.'
    localErrors.phone = 'Add an email or phone number.'
  }

  if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
    localErrors.email = 'Enter a valid email address.'
  }

  if (form.message.length > 2000) {
    localErrors.message = 'Please keep your message under 2,000 characters.'
  }

  return Object.keys(localErrors).length === 0
}

function submissionError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status

    if (status === 422) {
      return 'Please check the highlighted fields.'
    }

    if (status === 429) {
      return "You've submitted a little too quickly. Please wait a moment and try again."
    }
  }

  return "We couldn't send your request right now. Please try again."
}

async function submit(): Promise<void> {
  if (sending.value || !validate()) {
    return
  }

  sending.value = true
  formError.value = ''

  try {
    const created = await createPublicLead({
      name: form.name.trim(),
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      service_id: form.service_id === '' ? null : Number(form.service_id),
      message: form.message.trim() || null,
      company: form.company,
    })
    submittedName.value = created.name
    success.value = true
  } catch (error) {
    const serverFields = fieldErrors(error)
    Object.assign(localErrors, serverFields)
    formError.value = submissionError(error)
  } finally {
    sending.value = false
  }
}

function resetForm(): void {
  form.name = ''
  form.email = ''
  form.phone = ''
  form.service_id = ''
  form.message = ''
  form.company = ''
  formError.value = ''
  Object.keys(localErrors).forEach((key) => delete localErrors[key])
  success.value = false
}
</script>

<template>
  <div class="pub-form-card relative">
    <Transition name="pub-success" mode="out-in">
      <div v-if="success" key="success" class="py-10 text-center" role="status" aria-live="polite">
        <span class="pub-success-icon mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-lf-success">
          <CircleCheck :size="28" :stroke-width="1.75" />
        </span>
        <div class="pub-success-copy">
          <h3 class="mt-5 text-2xl font-semibold text-lf-ink">Request received</h3>
          <p class="mx-auto mt-2 max-w-md text-sm leading-6 text-lf-muted">
            Thanks, {{ firstName }}. We've received your request and our team will review it shortly.
          </p>
        </div>
        <div class="pub-success-action">
          <AppButton class="mt-6" variant="secondary" @click="resetForm">Send another request</AppButton>
        </div>
      </div>

      <form v-else key="form" class="space-y-5" novalidate @submit.prevent="submit">
        <div>
          <p class="text-sm font-semibold text-lf-accent">Start a conversation</p>
          <h3 class="mt-1 text-2xl font-semibold tracking-tight text-lf-ink">Tell us a little about your request</h3>
          <p class="mt-2 text-sm leading-6 text-lf-muted">
            A few details are enough. The team will take it from there.
          </p>
        </div>

        <div class="pub-honeypot" aria-hidden="true">
          <label for="public-company">Company</label>
          <input id="public-company" v-model="form.company" type="text" tabindex="-1" autocomplete="off">
        </div>

        <div class="lf-field">
          <label class="lf-label" for="public-name">Full name <span class="text-lf-danger">*</span></label>
          <input
            id="public-name"
            v-model="form.name"
            type="text"
            autocomplete="name"
            required
            class="lf-control pub-control"
            :aria-invalid="Boolean(localErrors.name)"
            :aria-describedby="localErrors.name ? 'public-name-error' : undefined"
            @input="clearField('name')"
          >
          <Transition name="pub-field-error">
            <p v-if="localErrors.name" id="public-name-error" class="pub-field-error">{{ localErrors.name }}</p>
          </Transition>
        </div>

        <div class="grid gap-4 sm:grid-cols-2">
          <div class="lf-field">
            <label class="lf-label" for="public-email">Email</label>
            <input
              id="public-email"
              v-model="form.email"
              type="email"
              autocomplete="email"
              class="lf-control pub-control"
              :aria-invalid="Boolean(localErrors.email)"
              :aria-describedby="localErrors.email ? 'public-email-error' : undefined"
              @input="clearField('email')"
            >
            <Transition name="pub-field-error">
              <p v-if="localErrors.email" id="public-email-error" class="pub-field-error">{{ localErrors.email }}</p>
            </Transition>
          </div>
          <div class="lf-field">
            <label class="lf-label" for="public-phone">Phone</label>
            <input
              id="public-phone"
              v-model="form.phone"
              type="tel"
              autocomplete="tel"
              class="lf-control pub-control"
              :aria-invalid="Boolean(localErrors.phone)"
              :aria-describedby="localErrors.phone ? 'public-phone-error' : undefined"
              @input="clearField('phone')"
            >
            <Transition name="pub-field-error">
              <p v-if="localErrors.phone" id="public-phone-error" class="pub-field-error">{{ localErrors.phone }}</p>
            </Transition>
          </div>
        </div>
        <p class="text-xs text-lf-muted">Email or phone is required.</p>

        <div class="lf-field">
          <label class="lf-label" for="public-service">Service <span class="font-normal text-lf-muted">(optional)</span></label>
          <select
            id="public-service"
            v-model="form.service_id"
            class="lf-control pub-control"
            :aria-invalid="Boolean(localErrors.service_id)"
            :aria-describedby="localErrors.service_id ? 'public-service-error' : undefined"
            @change="clearField('service_id')"
          >
            <option value="">I’m not sure yet</option>
            <option v-for="service in props.services" :key="service.id" :value="service.id">
              {{ service.name }} ({{ service.duration_minutes }} min)
            </option>
          </select>
          <Transition name="pub-field-error">
            <p v-if="localErrors.service_id" id="public-service-error" class="pub-field-error">{{ localErrors.service_id }}</p>
          </Transition>
        </div>

        <div class="lf-field">
          <label class="lf-label" for="public-message">How can we help? <span class="font-normal text-lf-muted">(optional)</span></label>
          <textarea
            id="public-message"
            v-model="form.message"
            rows="4"
            maxlength="2000"
            class="lf-control pub-control"
            placeholder="Share the service you’re interested in or a convenient time to talk."
            :aria-invalid="Boolean(localErrors.message)"
            :aria-describedby="localErrors.message ? 'public-message-error' : undefined"
            @input="clearField('message')"
          />
          <p class="mt-1 text-xs text-lf-muted">{{ form.message.length }}/2000</p>
          <Transition name="pub-field-error">
            <p v-if="localErrors.message" id="public-message-error" class="pub-field-error">{{ localErrors.message }}</p>
          </Transition>
        </div>

        <Transition name="pub-field-error">
          <p v-if="formError" class="pub-form-alert" role="alert">
            <CircleAlert :size="16" :stroke-width="1.75" />
            <span>{{ formError }}</span>
          </p>
        </Transition>

        <AppButton type="submit" :loading="sending" class="pub-cta w-full sm:w-auto">
          {{ sending ? 'Sending...' : 'Get started' }}
          <ArrowRight v-if="!sending" class="pub-cta-arrow" :size="16" :stroke-width="1.75" />
        </AppButton>
      </form>
    </Transition>
  </div>
</template>

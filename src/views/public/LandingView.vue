<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue'
import {
  ArrowRight,
  CalendarCheck,
  CalendarClock,
  ClipboardList,
  Inbox,
  Menu,
  MessageSquareMore,
  Sparkles,
  X,
} from 'lucide-vue-next'
import { listPublicServices } from '@/api/public'
import PublicLeadForm from '@/components/public/PublicLeadForm.vue'
import AppButton from '@/components/ui/AppButton.vue'
import { useOnceReveal } from '@/composables/useOnceReveal'
import { friendlyApiError } from '@/lib/errors'
import type { PublicService } from '@/types/api'

const serviceVisuals = ['/images/supporting-care.jpg', '/images/supporting-conversation.jpg'] as const

const page = ref<HTMLElement | null>(null)
const navSentinel = ref<HTMLElement | null>(null)
const services = ref<PublicService[]>([])
const loadingServices = ref(true)
const serviceError = ref('')
const menuOpen = ref(false)
const scrolled = ref(false)
const preferredServiceId = ref<number | null>(null)

const steps = [
  { icon: MessageSquareMore, title: 'Tell us what you need', body: 'Share your name, a way to reach you, and the service you have in mind.' },
  { icon: Inbox, title: 'Your request enters LeadFlow', body: 'The submission becomes a normal lead so the team can see it in one place.' },
  { icon: ClipboardList, title: 'The team reviews the request', body: 'Staff qualify the inquiry, assign an owner, and decide what happens next.' },
  { icon: CalendarClock, title: 'The next step is scheduled', body: 'Appointments are booked inside the CRM after follow-up — not from this page.' },
]

useOnceReveal(page)

let navObserver: IntersectionObserver | null = null

function visualFor(index: number): string {
  return serviceVisuals[index % serviceVisuals.length] ?? serviceVisuals[0]
}

async function loadServices(): Promise<void> {
  loadingServices.value = true
  serviceError.value = ''

  try {
    services.value = await listPublicServices()
  } catch (error) {
    serviceError.value = friendlyApiError(error, 'Unable to load services right now.')
    services.value = []
  } finally {
    loadingServices.value = false
  }
}

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function closeMenu(): void {
  menuOpen.value = false
}

function goTo(id: string, focusId?: string): void {
  closeMenu()
  document.getElementById(id)?.scrollIntoView({
    behavior: prefersReducedMotion() ? 'auto' : 'smooth',
    block: 'start',
  })

  if (!focusId) {
    return
  }

  window.setTimeout(() => {
    document.getElementById(focusId)?.focus({ preventScroll: true })
  }, prefersReducedMotion() ? 0 : 380)
}

function requestService(serviceId: number): void {
  preferredServiceId.value = serviceId
  goTo('contact', 'public-name')
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape' && menuOpen.value) {
    closeMenu()
  }
}

watch(menuOpen, (open) => {
  document.body.style.overflow = open ? 'hidden' : ''
})

onMounted(() => {
  document.addEventListener('keydown', onKeydown)
  void loadServices()

  if (!navSentinel.value) {
    return
  }

  navObserver = new IntersectionObserver(
    ([entry]) => {
      scrolled.value = !entry?.isIntersecting
    },
    { threshold: 0 },
  )
  navObserver.observe(navSentinel.value)
})

onUnmounted(() => {
  document.body.style.overflow = ''
  document.removeEventListener('keydown', onKeydown)
  navObserver?.disconnect()
})
</script>

<template>
  <div ref="page" class="pub-page min-h-screen text-lf-ink">
    <div ref="navSentinel" class="absolute top-0 h-px w-full" aria-hidden="true" />

    <header class="pub-nav sticky top-0 z-30" :class="{ 'is-scrolled': scrolled }">
      <div class="pub-shell flex items-center justify-between gap-4 py-3.5">
        <a href="#top" class="flex items-center gap-2.5" @click.prevent="goTo('top')">
          <span class="flex h-9 w-9 items-center justify-center rounded-[var(--radius-lf)] bg-lf-forest text-sm font-semibold text-white">L</span>
          <span class="text-base font-semibold tracking-tight">LeadFlow</span>
        </a>

        <nav class="hidden items-center gap-8 text-sm text-lf-muted md:flex" aria-label="Landing">
          <a href="#services" class="pub-nav-link" @click.prevent="goTo('services')">Services</a>
          <a href="#how-it-works" class="pub-nav-link" @click.prevent="goTo('how-it-works')">How it works</a>
          <a href="#contact" class="pub-nav-link" @click.prevent="goTo('contact')">Contact</a>
        </nav>

        <div class="hidden md:block">
          <AppButton class="pub-cta" @click="goTo('contact', 'public-name')">
            Get started
            <ArrowRight class="pub-cta-arrow" :size="16" :stroke-width="1.75" />
          </AppButton>
        </div>

        <button
          type="button"
          class="rounded-[var(--radius-lf)] p-2 text-lf-ink transition duration-150 hover:bg-lf-forest/5 md:hidden"
          :aria-expanded="menuOpen"
          aria-controls="public-menu"
          :aria-label="menuOpen ? 'Close menu' : 'Open menu'"
          @click="menuOpen = !menuOpen"
        >
          <X v-if="menuOpen" :size="20" :stroke-width="1.75" />
          <Menu v-else :size="20" :stroke-width="1.75" />
        </button>
      </div>

      <Transition name="pub-menu">
        <div v-if="menuOpen" id="public-menu" class="pub-menu border-t border-lf-forest/10 px-4 py-4 md:hidden">
          <nav class="flex flex-col gap-3 text-sm" aria-label="Mobile">
            <a href="#services" @click.prevent="goTo('services')">Services</a>
            <a href="#how-it-works" @click.prevent="goTo('how-it-works')">How it works</a>
            <a href="#contact" @click.prevent="goTo('contact')">Contact</a>
            <AppButton class="pub-cta w-full" @click="goTo('contact', 'public-name')">
              Get started
              <ArrowRight class="pub-cta-arrow" :size="16" :stroke-width="1.75" />
            </AppButton>
          </nav>
        </div>
      </Transition>
    </header>

    <main id="top">
      <section class="pub-hero relative overflow-hidden">
        <div class="pub-hero-glow" aria-hidden="true" />

        <div class="pub-shell grid items-center gap-10 py-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.95fr)] lg:gap-16 lg:py-24">
          <div class="pub-hero-copy min-w-0">
            <p class="pub-rise-1 text-sm font-semibold tracking-[0.16em] text-lf-accent">INQUIRY TO APPOINTMENT</p>
            <h1 class="pub-hero-title pub-rise-2 mt-4 max-w-[20ch] font-semibold tracking-tight text-lf-forest">
              Get the right service, without the back-and-forth.
            </h1>
            <p class="pub-rise-3 mt-5 max-w-lg text-base leading-7 text-lf-muted sm:text-lg">
              Tell us what you need. Your request becomes a lead in LeadFlow so the team can review it and help with the next step.
            </p>
            <div class="pub-rise-4 mt-8 flex flex-wrap items-center gap-3">
              <AppButton class="pub-cta" @click="goTo('contact', 'public-name')">
                Get started
                <ArrowRight class="pub-cta-arrow" :size="16" :stroke-width="1.75" />
              </AppButton>
              <a
                href="#services"
                class="inline-flex items-center rounded-[var(--radius-lf)] px-3.5 py-2 text-sm font-medium text-lf-forest transition duration-150 hover:bg-lf-forest/5"
                @click.prevent="goTo('services')"
              >
                Explore services
              </a>
            </div>
          </div>

          <aside class="pub-hero-visual min-w-0">
            <div class="pub-hero-photo">
              <img
                src="/images/hero-consultation.jpg"
                alt="A clinician talking with a client during an in-person consultation"
                width="800"
                height="640"
                fetchpriority="high"
              >
              <div class="pub-hero-status">
                <span class="h-1.5 w-1.5 rounded-full bg-lf-success" />
                Ready for review
              </div>
            </div>
            <ol class="pub-hero-flow">
              <li>Request</li>
              <li>Review</li>
              <li>Schedule</li>
            </ol>
          </aside>
        </div>
      </section>

      <section class="pub-trust" data-reveal>
        <div class="pub-shell grid gap-8 py-10 sm:grid-cols-3">
          <p class="text-sm leading-6 text-lf-muted"><span class="font-semibold text-lf-ink">Active services only.</span> Visitors choose from the same catalog your team maintains.</p>
          <p class="text-sm leading-6 text-lf-muted"><span class="font-semibold text-lf-ink">No public booking yet.</span> This page captures the request. Scheduling stays inside LeadFlow.</p>
          <p class="text-sm leading-6 text-lf-muted"><span class="font-semibold text-lf-ink">One pipeline.</span> Every submission lands in New, unassigned, ready for review.</p>
        </div>
      </section>

      <section id="services" class="pub-section scroll-mt-24">
        <div class="pub-shell">
          <div class="max-w-2xl" data-reveal>
            <p class="text-sm font-semibold text-lf-accent">Services</p>
            <h2 class="mt-2 text-3xl font-semibold tracking-tight text-lf-forest sm:text-4xl">Everything starts with a simple request.</h2>
            <p class="mt-3 text-sm leading-6 text-lf-muted">These are the active services currently offered. Durations come from the catalog, not marketing copy.</p>
          </div>

          <div v-if="loadingServices" class="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <div v-for="card in 3" :key="card" class="overflow-hidden rounded-[var(--radius-lf)] border border-lf-line bg-white">
              <div class="skeleton h-40 w-full rounded-none" />
              <div class="p-5">
                <div class="skeleton h-4 w-20" />
                <div class="skeleton mt-3 h-6 w-40" />
                <div class="skeleton mt-3 h-10 w-full" />
              </div>
            </div>
          </div>

          <div v-else-if="serviceError" class="mt-10 rounded-[var(--radius-lf)] border border-lf-line bg-white p-6" data-reveal>
            <p class="text-sm text-lf-danger">{{ serviceError }}</p>
            <AppButton class="mt-4" variant="secondary" @click="loadServices">Retry</AppButton>
          </div>

          <div v-else-if="services.length === 0" class="mt-10 rounded-[var(--radius-lf)] border border-dashed border-lf-line bg-white p-6 text-sm text-lf-muted" data-reveal>
            Services will appear here once the catalog has active offerings.
          </div>

          <ul v-else class="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <li
              v-for="(service, index) in services"
              :key="service.id"
              class="pub-service-card"
              data-reveal
              :style="{ transitionDelay: `${index * 70}ms` }"
            >
              <div class="pub-service-media">
                <img :src="visualFor(index)" alt="" width="640" height="400" loading="lazy">
              </div>
              <div class="p-5">
                <div class="flex items-center justify-between gap-3">
                  <span class="flex h-9 w-9 items-center justify-center rounded-[var(--radius-lf)] bg-[#eef6f2] text-lf-accent">
                    <CalendarCheck :size="16" :stroke-width="1.75" />
                  </span>
                  <span class="rounded-full bg-[#eef6f2] px-2.5 py-1 text-xs font-semibold text-lf-forest">
                    {{ service.duration_minutes }} min
                  </span>
                </div>
                <h3 class="mt-4 text-lg font-semibold text-lf-ink">{{ service.name }}</h3>
                <p class="mt-2 text-sm leading-6 text-lf-muted">{{ service.description || 'Available for new inquiries.' }}</p>
                <button type="button" class="pub-service-action" @click="requestService(service.id)">
                  Request this
                  <ArrowRight :size="14" :stroke-width="1.75" />
                </button>
              </div>
            </li>
          </ul>
        </div>
      </section>

      <section id="how-it-works" class="pub-section scroll-mt-24 bg-lf-forest text-white">
        <div class="pub-shell grid items-start gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
          <div data-reveal>
            <p class="text-sm font-semibold text-lf-accent">How it works</p>
            <h2 class="mt-2 max-w-md text-3xl font-semibold tracking-tight sm:text-4xl">From a short request to an organized follow-up.</h2>
            <div class="pub-process-photo mt-8">
              <img
                src="/images/supporting-conversation.jpg"
                alt="A practitioner preparing a wellness treatment for a client"
                width="900"
                height="680"
                loading="lazy"
              >
            </div>
          </div>
          <ol class="pub-timeline">
            <li v-for="(step, index) in steps" :key="step.title" data-reveal :style="{ transitionDelay: `${index * 80}ms` }">
              <div class="pub-timeline-rail" aria-hidden="true">
                <span class="pub-timeline-dot">0{{ index + 1 }}</span>
                <span v-if="index < steps.length - 1" class="pub-timeline-line" />
              </div>
              <div class="pb-10 last:pb-0">
                <span class="flex h-10 w-10 items-center justify-center rounded-[var(--radius-lf)] bg-white/10">
                  <component :is="step.icon" :size="18" :stroke-width="1.75" />
                </span>
                <h3 class="mt-4 text-lg font-semibold">{{ step.title }}</h3>
                <p class="mt-2 text-sm leading-6 text-white/65">{{ step.body }}</p>
              </div>
            </li>
          </ol>
        </div>
      </section>

      <section id="contact" class="pub-capture pub-section scroll-mt-24">
        <div class="pub-shell grid items-start gap-12 lg:grid-cols-[0.85fr_1.15fr]">
          <div data-reveal>
            <p class="text-sm font-semibold text-lf-accent">Contact</p>
            <h2 class="mt-2 text-3xl font-semibold tracking-tight text-lf-forest sm:text-4xl">Start with what you need.</h2>
            <p class="mt-4 max-w-md text-sm leading-6 text-lf-muted">
              Tell us a little about your request and the team will take it from there. This form creates a lead. It does not book a time on the calendar.
            </p>
            <ul class="mt-8 space-y-3 text-sm text-lf-muted">
              <li class="flex items-center gap-2">
                <Sparkles :size="16" :stroke-width="1.75" class="text-lf-accent" />
                Lands in the New pipeline stage
              </li>
              <li class="flex items-center gap-2">
                <Sparkles :size="16" :stroke-width="1.75" class="text-lf-accent" />
                Uses your real service catalog
              </li>
              <li class="flex items-center gap-2">
                <Sparkles :size="16" :stroke-width="1.75" class="text-lf-accent" />
                Stays unassigned until staff pick it up
              </li>
            </ul>
          </div>
          <div data-reveal>
            <PublicLeadForm :services="services" :preferred-service-id="preferredServiceId" />
          </div>
        </div>
      </section>

      <section class="px-4 pb-20 sm:px-6">
        <div class="pub-final-cta relative overflow-hidden" data-reveal>
          <div class="pub-final-cta-orb" aria-hidden="true" />
          <div class="relative flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
            <div>
              <h2 class="text-2xl font-semibold tracking-tight sm:text-3xl">Ready to take the next step?</h2>
              <p class="mt-2 max-w-xl text-sm text-white/65">Tell us what you need and let the team handle the follow-up.</p>
            </div>
            <AppButton class="pub-cta" @click="goTo('contact', 'public-name')">
              Get started
              <ArrowRight class="pub-cta-arrow" :size="16" :stroke-width="1.75" />
            </AppButton>
          </div>
        </div>
      </section>
    </main>

    <footer class="border-t border-lf-forest/10">
      <div class="pub-shell flex flex-col gap-5 py-10 text-sm text-lf-muted">
        <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p class="font-semibold text-lf-ink">LeadFlow</p>
            <p class="mt-1">Turn inquiries into organized follow-up.</p>
          </div>
          <nav class="flex flex-wrap gap-x-5 gap-y-2" aria-label="Footer">
            <a href="#services" class="pub-nav-link" @click.prevent="goTo('services')">Services</a>
            <a href="#how-it-works" class="pub-nav-link" @click.prevent="goTo('how-it-works')">How it works</a>
            <a href="#contact" class="pub-nav-link" @click.prevent="goTo('contact', 'public-name')">Get started</a>
          </nav>
        </div>
      </div>
    </footer>
  </div>
</template>

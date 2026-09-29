<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import AppBadge from '@/components/ui/AppBadge.vue'
import {
  formatMonthDay,
  formatTime,
  formatWeekdayShort,
  manilaMinutesSinceMidnight,
  manilaToday,
  minutesFromMidnight,
  minutesToClock,
  snapToHalfHour,
  weekDates,
} from '@/lib/format'
import { appointmentTone } from '@/lib/stage'
import type { Appointment } from '@/types/api'

const PX_PER_MINUTE = 1.25
const DEFAULT_START = 7 * 60
const DEFAULT_END = 21 * 60

const props = defineProps<{
  grain: 'day' | 'week'
  focusDate: string
  appointments: Appointment[]
}>()

const emit = defineEmits<{
  book: [{ date: string; startTime: string }]
}>()

const nowMinutes = ref(manilaMinutesSinceMidnight())
const today = computed(() => manilaToday())
let tick: ReturnType<typeof setInterval> | undefined

const days = computed(() =>
  props.grain === 'week' ? weekDates(props.focusDate) : [props.focusDate],
)

const occupying = computed(() =>
  props.appointments.filter((appointment) => appointment.status !== 'cancelled'),
)

const visibleStart = computed(() => {
  let start = DEFAULT_START
  for (const appointment of occupying.value) {
    start = Math.min(start, minutesFromMidnight(appointment.start_time))
  }
  if (days.value.includes(today.value)) {
    start = Math.min(start, nowMinutes.value)
  }
  return Math.max(0, Math.floor(start / 60) * 60)
})

const visibleEnd = computed(() => {
  let end = DEFAULT_END
  for (const appointment of occupying.value) {
    end = Math.max(end, minutesFromMidnight(appointment.end_time))
  }
  if (days.value.includes(today.value)) {
    end = Math.max(end, nowMinutes.value + 30)
  }
  return Math.min(24 * 60, Math.ceil(end / 60) * 60)
})

const hours = computed(() => {
  const labels: number[] = []
  for (let minute = visibleStart.value; minute < visibleEnd.value; minute += 60) {
    labels.push(minute)
  }
  return labels
})

const gridHeight = computed(() => (visibleEnd.value - visibleStart.value) * PX_PER_MINUTE)

function appointmentsOn(date: string): Appointment[] {
  return occupying.value.filter((appointment) => appointment.scheduled_date === date)
}

function layout(date: string): { appointment: Appointment; column: number; columns: number }[] {
  const items = [...appointmentsOn(date)].sort((left, right) => {
    const startDiff = minutesFromMidnight(left.start_time) - minutesFromMidnight(right.start_time)
    if (startDiff !== 0) {
      return startDiff
    }
    return minutesFromMidnight(left.end_time) - minutesFromMidnight(right.end_time)
  })

  const columnEnds: number[] = []
  const placed = items.map((appointment) => {
    const start = minutesFromMidnight(appointment.start_time)
    const end = minutesFromMidnight(appointment.end_time)
    let column = columnEnds.findIndex((occupiedUntil) => occupiedUntil <= start)
    if (column === -1) {
      column = columnEnds.length
      columnEnds.push(end)
    } else {
      columnEnds[column] = end
    }
    return { appointment, column, columns: 1 }
  })

  const columns = Math.max(1, columnEnds.length)
  return placed.map((item) => ({ ...item, columns }))
}

function blockStyle(appointment: Appointment, column: number, columns: number): Record<string, string> {
  const start = minutesFromMidnight(appointment.start_time)
  const end = Math.max(start + 15, minutesFromMidnight(appointment.end_time))
  const gap = 4
  const width = `calc((100% - ${(columns - 1) * gap}px) / ${columns})`
  const left = `calc(${column} * ((100% - ${(columns - 1) * gap}px) / ${columns} + ${gap}px))`

  return {
    top: `${(start - visibleStart.value) * PX_PER_MINUTE}px`,
    height: `${(end - start) * PX_PER_MINUTE}px`,
    left,
    width,
  }
}

function blockToneClass(status: string): string {
  const map: Record<string, string> = {
    scheduled: 'border-sky-300 bg-sky-50',
    confirmed: 'border-emerald-300 bg-emerald-50',
    completed: 'border-emerald-400 bg-emerald-100',
    no_show: 'border-rose-300 bg-rose-50',
  }
  return map[status] ?? 'border-lf-line bg-white'
}

function blockLabel(appointment: Appointment): string {
  const customer = appointment.customer?.name ?? 'Customer'
  const service = appointment.service?.name ?? 'Appointment'
  return `${customer}, ${service}, ${formatTime(appointment.start_time)} to ${formatTime(appointment.end_time)}, ${appointment.status_label}`
}

function nowTop(): number {
  return (nowMinutes.value - visibleStart.value) * PX_PER_MINUTE
}

function showNow(date: string): boolean {
  return date === today.value
    && nowMinutes.value >= visibleStart.value
    && nowMinutes.value <= visibleEnd.value
}

function onGridClick(event: MouseEvent, date: string): void {
  const target = event.target as HTMLElement
  if (target.closest('a')) {
    return
  }

  const column = event.currentTarget as HTMLElement
  const bounds = column.getBoundingClientRect()
  const offsetY = event.clientY - bounds.top
  const minutes = visibleStart.value + offsetY / PX_PER_MINUTE
  const snapped = snapToHalfHour(minutes)

  if (snapped < visibleStart.value || snapped >= visibleEnd.value) {
    return
  }

  emit('book', { date, startTime: minutesToClock(snapped) })
}

onMounted(() => {
  tick = window.setInterval(() => {
    nowMinutes.value = manilaMinutesSinceMidnight()
  }, 30000)
})

onUnmounted(() => {
  if (tick) {
    window.clearInterval(tick)
  }
})
</script>

<template>
  <div class="overflow-x-auto rounded-[var(--radius-lf)] border border-lf-line bg-white">
    <div :class="grain === 'week' ? 'min-w-[800px]' : ''">
      <div class="grid border-b border-lf-line" :style="{ gridTemplateColumns: `4.5rem repeat(${days.length}, minmax(0, 1fr))` }">
        <div class="bg-[#f8faf9]" />
        <div
          v-for="date in days"
          :key="date"
          class="border-l border-lf-line px-2 py-2 text-center"
          :class="date === today ? 'bg-lf-soft' : 'bg-[#f8faf9]'"
        >
          <p class="text-xs font-semibold tracking-wide text-lf-muted uppercase">{{ formatWeekdayShort(date) }}</p>
          <p class="mt-0.5 text-sm font-semibold text-lf-ink">{{ formatMonthDay(date) }}</p>
          <p v-if="date === today" class="mt-0.5 text-[11px] font-medium text-lf-accent">Today</p>
        </div>
      </div>

      <div class="grid" :style="{ gridTemplateColumns: `4.5rem repeat(${days.length}, minmax(0, 1fr))` }">
        <div class="relative" :style="{ height: `${gridHeight}px` }">
          <div
            v-for="hour in hours"
            :key="hour"
            class="absolute right-2 text-[11px] text-lf-muted"
            :style="{ top: `${(hour - visibleStart) * PX_PER_MINUTE - 7}px` }"
          >
            {{ minutesToClock(hour) }}
          </div>
        </div>

        <div
          v-for="date in days"
          :key="date"
          class="relative cursor-pointer border-l border-lf-line"
          :class="date === today ? 'bg-emerald-50/30' : 'bg-white'"
          :style="{ height: `${gridHeight}px` }"
          @click="onGridClick($event, date)"
        >
          <div
            v-for="hour in hours"
            :key="`${date}-${hour}`"
            class="pointer-events-none absolute inset-x-0 border-t border-lf-line/80"
            :style="{ top: `${(hour - visibleStart) * PX_PER_MINUTE}px` }"
          />
          <div
            v-for="half in hours"
            :key="`${date}-half-${half}`"
            class="pointer-events-none absolute inset-x-0 border-t border-dashed border-lf-line/50"
            :style="{ top: `${(half + 30 - visibleStart) * PX_PER_MINUTE}px` }"
          />

          <RouterLink
            v-for="item in layout(date)"
            :key="item.appointment.id"
            :to="`/admin/appointments/${item.appointment.id}`"
            class="absolute z-10 overflow-hidden rounded-md border px-1.5 py-1 text-left shadow-sm transition hover:brightness-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-lf-accent"
            :class="blockToneClass(item.appointment.status)"
            :style="blockStyle(item.appointment, item.column, item.columns)"
            :aria-label="blockLabel(item.appointment)"
            @click.stop
          >
            <p class="truncate text-xs font-semibold text-lf-ink">{{ item.appointment.customer?.name ?? 'Customer' }}</p>
            <p class="truncate text-[11px] text-lf-muted">
              {{ formatTime(item.appointment.start_time) }}–{{ formatTime(item.appointment.end_time) }}
            </p>
            <p class="truncate text-[11px] text-lf-ink">{{ item.appointment.service?.name ?? 'Appointment' }}</p>
            <AppBadge class="mt-0.5" :tone="appointmentTone(item.appointment.status)">
              {{ item.appointment.status_label }}
            </AppBadge>
          </RouterLink>

          <div
            v-if="showNow(date)"
            class="pointer-events-none absolute inset-x-0 z-20 flex items-center"
            :style="{ top: `${nowTop()}px` }"
          >
            <span class="ml-1 rounded bg-lf-danger px-1 text-[9px] font-semibold tracking-wide text-white uppercase">Now</span>
            <span class="h-px flex-1 bg-lf-danger" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

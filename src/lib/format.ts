export function initials(name: string | null | undefined): string {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean)

  if (parts.length === 0) {
    return '?'
  }

  const first = parts[0] ?? ''
  const last = parts[parts.length - 1] ?? first

  if (parts.length === 1) {
    return first.slice(0, 2).toUpperCase()
  }

  return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase()
}

export function formatDate(value: string | null | undefined): string {
  if (!value) {
    return '—'
  }

  return new Date(value).toLocaleDateString()
}

export function formatDateOnly(value: string | null | undefined): string {
  if (!value) {
    return '—'
  }

  const [year, month, day] = value.slice(0, 10).split('-').map(Number)
  if (!year || !month || !day) {
    return formatDate(value)
  }

  return new Date(year, month - 1, day).toLocaleDateString()
}

export function formatTime(value: string | null | undefined): string {
  if (!value) {
    return '—'
  }

  const [hourPart, minutePart] = value.slice(0, 5).split(':')
  const hour = Number(hourPart)
  const minute = Number(minutePart)
  if (Number.isNaN(hour) || Number.isNaN(minute)) {
    return value.slice(0, 5)
  }

  const date = new Date()
  date.setHours(hour, minute, 0, 0)

  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

export function todayDateInput(): string {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')

  return `${now.getFullYear()}-${month}-${day}`
}

export const APP_TIMEZONE = 'Asia/Manila'

function pad2(value: number): string {
  return String(value).padStart(2, '0')
}

function partValue(parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes): string {
  return parts.find((part) => part.type === type)?.value ?? ''
}

export function manilaToday(): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: APP_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())

  return `${partValue(parts, 'year')}-${partValue(parts, 'month')}-${partValue(parts, 'day')}`
}

export function manilaMinutesSinceMidnight(): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: APP_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date())

  return Number(partValue(parts, 'hour')) * 60 + Number(partValue(parts, 'minute'))
}

export function dateFromIso(value: string): Date {
  const [year = 1970, month = 1, day = 1] = value.slice(0, 10).split('-').map(Number)

  return new Date(year, month - 1, day)
}

export function isoFromDate(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`
}

export function addDays(isoDate: string, days: number): string {
  const date = dateFromIso(isoDate)
  date.setDate(date.getDate() + days)

  return isoFromDate(date)
}

export function startOfWeekMonday(isoDate: string): string {
  const date = dateFromIso(isoDate)
  const weekday = date.getDay()
  const offset = weekday === 0 ? -6 : 1 - weekday
  date.setDate(date.getDate() + offset)

  return isoFromDate(date)
}

export function weekDates(isoDate: string): string[] {
  const start = startOfWeekMonday(isoDate)

  return Array.from({ length: 7 }, (_, index) => addDays(start, index))
}

export function minutesFromMidnight(time: string): number {
  const [hour, minute] = time.slice(0, 5).split(':').map(Number)

  return (hour || 0) * 60 + (minute || 0)
}

export function minutesToClock(minutes: number): string {
  const clamped = Math.max(0, Math.min(24 * 60 - 1, minutes))

  return `${pad2(Math.floor(clamped / 60))}:${pad2(clamped % 60)}`
}

export function snapToHalfHour(minutes: number): number {
  return Math.round(minutes / 30) * 30
}

export function formatDayHeading(isoDate: string): string {
  return dateFromIso(isoDate).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

export function formatWeekRange(startIso: string, endIso: string): string {
  const start = dateFromIso(startIso)
  const end = dateFromIso(endIso)
  const startMonth = start.toLocaleDateString(undefined, { month: 'long' })
  const endMonth = end.toLocaleDateString(undefined, { month: 'long' })
  const year = end.getFullYear()

  if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
    return `${startMonth} ${start.getDate()} – ${end.getDate()}, ${year}`
  }

  return `${startMonth} ${start.getDate()} – ${endMonth} ${end.getDate()}, ${year}`
}

export function formatWeekdayShort(isoDate: string): string {
  return dateFromIso(isoDate).toLocaleDateString(undefined, { weekday: 'short' })
}

export function formatMonthDay(isoDate: string): string {
  return dateFromIso(isoDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) {
    return '—'
  }

  return new Date(value).toLocaleString()
}

export function contactLine(email?: string | null, phone?: string | null): string {
  return [email, phone].filter(Boolean).join(' · ') || 'No contact'
}

export function greeting(): string {
  const hour = new Date().getHours()

  if (hour < 12) {
    return 'Good morning'
  }

  if (hour < 17) {
    return 'Good afternoon'
  }

  return 'Good evening'
}

export function roleLabel(role: string | null | undefined): string {
  if (!role) {
    return ''
  }

  return role.charAt(0).toUpperCase() + role.slice(1)
}

export function firstName(name: string | null | undefined): string {
  return (name ?? 'there').trim().split(/\s+/)[0] || 'there'
}

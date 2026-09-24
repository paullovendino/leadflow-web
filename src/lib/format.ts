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

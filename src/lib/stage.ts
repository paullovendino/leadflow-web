export type StageTone = 'neutral' | 'info' | 'accent' | 'success' | 'warning' | 'danger' | 'violet'

const tones: Record<string, StageTone> = {
  new: 'neutral',
  contacted: 'info',
  qualified: 'accent',
  appointment_booked: 'violet',
  appointment_completed: 'violet',
  converted: 'success',
  not_interested: 'neutral',
  lost: 'danger',
  no_response: 'warning',
}

export function stageTone(slug: string | null | undefined): StageTone {
  return tones[slug ?? ''] ?? 'neutral'
}

const appointmentTones: Record<string, StageTone> = {
  scheduled: 'info',
  confirmed: 'accent',
  completed: 'success',
  cancelled: 'neutral',
  no_show: 'danger',
}

export function appointmentTone(status: string | null | undefined): StageTone {
  return appointmentTones[status ?? ''] ?? 'neutral'
}

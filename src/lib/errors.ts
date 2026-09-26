import axios from 'axios'

export function friendlyApiError(error: unknown, fallback: string): string {
  if (!axios.isAxiosError(error)) {
    return fallback
  }

  const status = error.response?.status
  const raw = error.response?.data?.message
  const message = typeof raw === 'string' ? raw.trim() : ''

  if (status === 403 || /unauthorized/i.test(message)) {
    return 'You do not have access to this record.'
  }

  if (status === 404) {
    return 'This record could not be found.'
  }

  if (status === 429) {
    return "You've submitted a little too quickly. Please wait a moment and try again."
  }

  if (status && status >= 500) {
    return 'Something went wrong while loading this page.'
  }

  if (message && !/exception|sqlstate|stack trace/i.test(message)) {
    return message
  }

  return fallback
}

export function fieldErrors(error: unknown): Record<string, string> {
  if (!axios.isAxiosError(error)) {
    return {}
  }

  const raw = error.response?.data?.errors
  if (!raw || typeof raw !== 'object') {
    return {}
  }

  const mapped: Record<string, string> = {}

  for (const [field, messages] of Object.entries(raw as Record<string, unknown>)) {
    if (Array.isArray(messages) && typeof messages[0] === 'string') {
      mapped[field] = messages[0]
    }
  }

  return mapped
}

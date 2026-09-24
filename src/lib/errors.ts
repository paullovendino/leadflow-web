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

  if (status && status >= 500) {
    return 'Something went wrong while loading this page.'
  }

  if (message && !/exception|sqlstate|stack trace/i.test(message)) {
    return message
  }

  return fallback
}

import http, { ensureCsrfCookie } from '@/lib/http'
import type { ApiResource, PublicLead, PublicService } from '@/types/api'

export async function listPublicServices(): Promise<PublicService[]> {
  const { data } = await http.get<ApiResource<PublicService[]>>('/api/v1/public/services')
  return data.data
}

export async function createPublicLead(payload: {
  name: string
  email: string | null
  phone: string | null
  service_id: number | null
  message: string | null
  company?: string
}): Promise<PublicLead> {
  await ensureCsrfCookie()
  const { data } = await http.post<ApiResource<PublicLead>>('/api/v1/public/leads', payload)
  return data.data
}

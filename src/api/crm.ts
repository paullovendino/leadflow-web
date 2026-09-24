import http from '@/lib/http'
import type {
  Activity,
  ApiPaginated,
  ApiResource,
  Appointment,
  AppointmentFilters,
  AppointmentSlot,
  AppointmentStatus,
  Customer,
  CustomerFilters,
  Lead,
  LeadFilters,
  Note,
  Pipeline,
  PipelineStage,
} from '@/types/api'

function leadQuery(filters: LeadFilters = {}): string {
  const params = new URLSearchParams()

  if (filters.search) {
    params.set('search', filters.search)
  }
  if (filters.stage) {
    params.set('stage', String(filters.stage))
  }
  if (filters.assigned_user) {
    params.set('assigned_user', String(filters.assigned_user))
  }
  if (filters.service) {
    params.set('service', String(filters.service))
  }
  if (filters.source) {
    params.set('source', filters.source)
  }
  if (filters.page) {
    params.set('page', String(filters.page))
  }
  if (filters.per_page) {
    params.set('per_page', String(filters.per_page))
  }

  const query = params.toString()
  return query ? `?${query}` : ''
}

export async function listLeads(filters: LeadFilters = {}): Promise<ApiPaginated<Lead>> {
  const { data } = await http.get<ApiPaginated<Lead>>(`/api/v1/leads${leadQuery(filters)}`)
  return data
}

export async function getLead(id: number): Promise<Lead> {
  const { data } = await http.get<ApiResource<Lead>>(`/api/v1/leads/${id}`)
  return data.data
}

export async function createLead(payload: Record<string, unknown>): Promise<Lead> {
  const { data } = await http.post<ApiResource<Lead>>('/api/v1/leads', payload)
  return data.data
}

export async function updateLead(id: number, payload: Record<string, unknown>): Promise<Lead> {
  const { data } = await http.patch<ApiResource<Lead>>(`/api/v1/leads/${id}`, payload)
  return data.data
}

export async function assignLead(id: number, assignedUserId: number | null): Promise<Lead> {
  const { data } = await http.patch<ApiResource<Lead>>(`/api/v1/leads/${id}/assignment`, {
    assigned_user_id: assignedUserId,
  })
  return data.data
}

export async function moveLead(id: number, pipelineStageId: number): Promise<Lead> {
  const { data } = await http.patch<ApiResource<Lead>>(`/api/v1/leads/${id}/stage`, {
    pipeline_stage_id: pipelineStageId,
  })
  return data.data
}

export async function listNotes(leadId: number): Promise<Note[]> {
  const { data } = await http.get<ApiResource<Note[]>>(`/api/v1/leads/${leadId}/notes`)
  return data.data
}

export async function createNote(leadId: number, body: string): Promise<Note> {
  const { data } = await http.post<ApiResource<Note>>(`/api/v1/leads/${leadId}/notes`, { body })
  return data.data
}

export async function listActivities(leadId: number): Promise<Activity[]> {
  const { data } = await http.get<ApiResource<Activity[]>>(`/api/v1/leads/${leadId}/activities`)
  return data.data
}

export async function getPipeline(): Promise<Pipeline> {
  const { data } = await http.get<ApiResource<Pipeline>>('/api/v1/pipeline')
  return data.data
}

export async function updatePipelineStage(
  id: number,
  payload: { name?: string; position?: number },
): Promise<PipelineStage> {
  const { data } = await http.patch<ApiResource<PipelineStage>>(`/api/v1/pipeline/stages/${id}`, payload)
  return data.data
}

export async function activatePipelineStage(id: number): Promise<PipelineStage> {
  const { data } = await http.post<ApiResource<PipelineStage>>(`/api/v1/pipeline/stages/${id}/activate`)
  return data.data
}

export async function deactivatePipelineStage(id: number): Promise<PipelineStage> {
  const { data } = await http.post<ApiResource<PipelineStage>>(`/api/v1/pipeline/stages/${id}/deactivate`)
  return data.data
}

function customerQuery(filters: CustomerFilters = {}): string {
  const params = new URLSearchParams()

  if (filters.search) {
    params.set('search', filters.search)
  }
  if (filters.source) {
    params.set('source', filters.source)
  }
  if (filters.page) {
    params.set('page', String(filters.page))
  }
  if (filters.per_page) {
    params.set('per_page', String(filters.per_page))
  }

  const query = params.toString()
  return query ? `?${query}` : ''
}

export async function listCustomers(filters: CustomerFilters = {}): Promise<ApiPaginated<Customer>> {
  const { data } = await http.get<ApiPaginated<Customer>>(`/api/v1/customers${customerQuery(filters)}`)
  return data
}

export async function getCustomer(id: number): Promise<Customer> {
  const { data } = await http.get<ApiResource<Customer>>(`/api/v1/customers/${id}`)
  return data.data
}

export async function createCustomer(payload: Record<string, unknown>): Promise<Customer> {
  const { data } = await http.post<ApiResource<Customer>>('/api/v1/customers', payload)
  return data.data
}

export async function updateCustomer(id: number, payload: Record<string, unknown>): Promise<Customer> {
  const { data } = await http.patch<ApiResource<Customer>>(`/api/v1/customers/${id}`, payload)
  return data.data
}

export async function convertLead(id: number): Promise<Lead> {
  const { data } = await http.post<ApiResource<Lead>>(`/api/v1/leads/${id}/convert`)
  return data.data
}

export async function listCustomerNotes(customerId: number): Promise<Note[]> {
  const { data } = await http.get<ApiResource<Note[]>>(`/api/v1/customers/${customerId}/notes`)
  return data.data
}

export async function createCustomerNote(customerId: number, body: string): Promise<Note> {
  const { data } = await http.post<ApiResource<Note>>(`/api/v1/customers/${customerId}/notes`, { body })
  return data.data
}

export async function listCustomerActivities(customerId: number): Promise<Activity[]> {
  const { data } = await http.get<ApiResource<Activity[]>>(`/api/v1/customers/${customerId}/activities`)
  return data.data
}

function appointmentQuery(filters: AppointmentFilters = {}): string {
  const params = new URLSearchParams()

  if (filters.search) {
    params.set('search', filters.search)
  }
  if (filters.status) {
    params.set('status', filters.status)
  }
  if (filters.staff_user_id) {
    params.set('staff_user_id', String(filters.staff_user_id))
  }
  if (filters.customer_id) {
    params.set('customer_id', String(filters.customer_id))
  }
  if (filters.service_id) {
    params.set('service_id', String(filters.service_id))
  }
  if (filters.date) {
    params.set('date', filters.date)
  }
  if (filters.date_from) {
    params.set('date_from', filters.date_from)
  }
  if (filters.date_to) {
    params.set('date_to', filters.date_to)
  }
  if (filters.page) {
    params.set('page', String(filters.page))
  }
  if (filters.per_page) {
    params.set('per_page', String(filters.per_page))
  }

  const query = params.toString()
  return query ? `?${query}` : ''
}

export async function listAppointments(filters: AppointmentFilters = {}): Promise<ApiPaginated<Appointment>> {
  const { data } = await http.get<ApiPaginated<Appointment>>(`/api/v1/appointments${appointmentQuery(filters)}`)
  return data
}

export async function getAppointment(id: number): Promise<Appointment> {
  const { data } = await http.get<ApiResource<Appointment>>(`/api/v1/appointments/${id}`)
  return data.data
}

export async function createAppointment(payload: Record<string, unknown>): Promise<Appointment> {
  const { data } = await http.post<ApiResource<Appointment>>('/api/v1/appointments', payload)
  return data.data
}

export async function updateAppointment(id: number, payload: Record<string, unknown>): Promise<Appointment> {
  const { data } = await http.patch<ApiResource<Appointment>>(`/api/v1/appointments/${id}`, payload)
  return data.data
}

export async function changeAppointmentStatus(
  id: number,
  status: AppointmentStatus,
): Promise<Appointment> {
  const { data } = await http.patch<ApiResource<Appointment>>(`/api/v1/appointments/${id}/status`, {
    status,
  })
  return data.data
}

export async function listAppointmentSlots(params: {
  staff_user_id: number
  date: string
  service_id: number
  ignore_appointment_id?: number
}): Promise<AppointmentSlot[]> {
  const query = new URLSearchParams({
    staff_user_id: String(params.staff_user_id),
    date: params.date,
    service_id: String(params.service_id),
  })

  if (params.ignore_appointment_id) {
    query.set('ignore_appointment_id', String(params.ignore_appointment_id))
  }

  const { data } = await http.get<ApiResource<AppointmentSlot[]>>(`/api/v1/appointments/slots?${query}`)
  return data.data
}

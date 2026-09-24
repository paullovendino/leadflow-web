export type UserRole = 'administrator' | 'manager' | 'staff'

export type DayOfWeek =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday'

export interface User {
  id: number
  name: string
  email: string
  role: UserRole
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Service {
  id: number
  name: string
  description: string | null
  duration_minutes: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface StaffAvailability {
  id: number
  user_id: number
  day_of_week: DayOfWeek
  start_time: string
  end_time: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface ApiMessage {
  message: string
}

export interface ApiResource<T> {
  data: T
}

export interface ApiPaginated<T> {
  data: T[]
  meta: {
    current_page: number
    last_page: number
    per_page: number
    total: number
  }
}

export type LeadSource =
  | 'website'
  | 'facebook'
  | 'instagram'
  | 'referral'
  | 'google'
  | 'walk_in'
  | 'other'

export type ActivityType =
  | 'lead_created'
  | 'lead_assigned'
  | 'stage_changed'
  | 'note_added'
  | 'lead_updated'
  | 'lead_converted'
  | 'customer_created'
  | 'appointment_created'
  | 'appointment_updated'
  | 'appointment_confirmed'
  | 'appointment_completed'
  | 'appointment_cancelled'
  | 'appointment_no_show'

export type AppointmentStatus =
  | 'scheduled'
  | 'confirmed'
  | 'completed'
  | 'cancelled'
  | 'no_show'

export interface PipelineStage {
  id: number
  pipeline_id: number
  name: string
  slug: string
  position: number
  is_active: boolean
}

export interface Pipeline {
  id: number
  name: string
  is_default: boolean
  is_active: boolean
  stages: PipelineStage[]
}

export interface Customer {
  id: number
  name: string
  email: string | null
  phone: string | null
  source: LeadSource | null
  leads?: Lead[]
  notes?: Note[]
  activities?: Activity[]
  appointments?: Appointment[]
  created_at: string
  updated_at: string
}

export interface Lead {
  id: number
  name: string
  email: string | null
  phone: string | null
  source: LeadSource | null
  message: string | null
  service: Service | null
  assigned_user: User | null
  pipeline_stage: PipelineStage | null
  customer?: Customer | null
  notes?: Note[]
  activities?: Activity[]
  created_at: string
  updated_at: string
}

export interface CustomerFilters {
  search?: string
  source?: LeadSource | ''
  page?: number
  per_page?: number
}

export type CustomerListResponse = ApiPaginated<Customer>
export type CustomerActivity = Activity
export type CustomerNote = Note

export interface Note {
  id: number
  body: string
  user: User | null
  created_at: string
}

export interface Activity {
  id: number
  type: ActivityType
  description: string
  metadata: Record<string, unknown>
  user: User | null
  created_at: string
}

export interface LeadFilters {
  search?: string
  stage?: number | ''
  assigned_user?: number | ''
  service?: number | ''
  source?: LeadSource | ''
  page?: number
  per_page?: number
}

export const leadSourceLabels: Record<LeadSource, string> = {
  website: 'Website',
  facebook: 'Facebook',
  instagram: 'Instagram',
  referral: 'Referral',
  google: 'Google',
  walk_in: 'Walk-in',
  other: 'Other',
}

export interface Appointment {
  id: number
  customer?: Customer
  service?: Service
  staff_user?: User
  scheduled_date: string
  start_time: string
  end_time: string
  duration_minutes?: number
  status: AppointmentStatus
  status_label: string
  allowed_transitions: AppointmentStatus[]
  notes: string | null
  activities?: Activity[]
  created_at: string
  updated_at: string
}

export interface AppointmentSlot {
  start_time: string
  end_time: string
}

export interface AppointmentFilters {
  search?: string
  status?: AppointmentStatus | ''
  staff_user_id?: number | ''
  customer_id?: number | ''
  service_id?: number | ''
  date?: string
  date_from?: string
  date_to?: string
  page?: number
  per_page?: number
}

export const appointmentStatuses: AppointmentStatus[] = [
  'scheduled',
  'confirmed',
  'completed',
  'cancelled',
  'no_show',
]

export const appointmentStatusLabels: Record<AppointmentStatus, string> = {
  scheduled: 'Scheduled',
  confirmed: 'Confirmed',
  completed: 'Completed',
  cancelled: 'Cancelled',
  no_show: 'No show',
}

export const leadSources: LeadSource[] = [
  'website',
  'facebook',
  'instagram',
  'referral',
  'google',
  'walk_in',
  'other',
]

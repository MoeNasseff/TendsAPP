export interface ExpenseCategory {
  id: string
  user_id: string
  name: string
  color: string | null
  icon: string | null
  created_at: string
}

export interface Expense {
  id: string
  user_id: string
  category_id: string | null
  amount: number
  currency: string
  note: string | null
  spent_at: string
  created_at: string
}

export interface Dog {
  id: string
  user_id: string
  name: string
  breed: string | null
  birthdate: string | null
  photo_url: string | null
  created_at: string
}

export type DogItemKind = 'vaccine' | 'medicine'
export type ScheduleType = 'once' | 'recurring'

export interface DogItem {
  id: string
  user_id: string
  dog_id: string
  kind: DogItemKind
  name: string
  description: string | null
  image_url: string | null
  dose: string | null
  schedule_type: ScheduleType
  due_at: string | null
  repeat_interval_days: number | null
  last_done_at: string | null
  active: boolean
  created_at: string
}

export interface Car {
  id: string
  user_id: string
  name: string
  make: string | null
  model: string | null
  year: number | null
  current_odometer_km: number
  photo_url: string | null
  created_at: string
}

export type CarServicePart =
  | 'oil'
  | 'oil_filter'
  | 'air_filter'
  | 'brake_pads'
  | 'tires'
  | 'coolant'
  | 'transmission'
  | 'battery'
  | 'other'

export interface CarService {
  id: string
  user_id: string
  car_id: string
  part: CarServicePart
  label: string | null
  last_service_km: number | null
  last_service_date: string | null
  interval_km: number | null
  interval_days: number | null
  note: string | null
  active: boolean
  created_at: string
}

export interface OdometerLog {
  id: string
  user_id: string
  car_id: string
  reading_km: number
  logged_at: string
  created_at: string
}

export interface Med {
  id: string
  user_id: string
  name: string
  description: string | null
  image_url: string | null
  dosage: string | null
  times_of_day: string[]
  days_of_week: number[]
  active: boolean
  created_at: string
}

export interface MedLog {
  id: string
  user_id: string
  med_id: string
  scheduled_for: string
  taken: boolean
  taken_at: string | null
  created_at: string
}

export type ReminderSourceModule = 'dog' | 'car' | 'meds' | 'expense'
export type ReminderStatus = 'scheduled' | 'sent' | 'snoozed' | 'cancelled' | 'done'
export type ReminderChannel = 'telegram' | 'push' | 'email' | 'whatsapp'

export interface Reminder {
  id: string
  user_id: string
  source_module: ReminderSourceModule
  source_id: string | null
  title: string
  body: string | null
  image_url: string | null
  fire_at: string
  channels: ReminderChannel[]
  status: ReminderStatus
  sent_at: string | null
  created_at: string
}

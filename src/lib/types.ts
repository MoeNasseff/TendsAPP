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

export type Sex = 'male' | 'female'
export type UnitSystem = 'metric' | 'imperial'

/** Sites measured on the figure. Keys match body_measurements columns. */
export type MeasurementSite =
  | 'neck'
  | 'shoulder'
  | 'chest'
  | 'bust'
  | 'underbust'
  | 'waist'
  | 'belly'
  | 'hips'
  | 'thigh'
  | 'calf'
  | 'upper_arm'
  | 'forearm'
  | 'wrist'
  | 'inseam'

/**
 * One measuring session. Every site is optional — a session records whatever
 * was actually measured. Lengths are centimetres and weight is kilograms
 * always; imperial is a display conversion only.
 */
export type BodyMeasurement = {
  id: string
  user_id: string
  taken_at: string
  weight_kg: number | null
  note: string | null
  created_at: string
} & { [S in MeasurementSite]: number | null }

/** Body-related fields on profiles, added by 20260804000001. */
export interface BodyProfile {
  sex: Sex | null
  unit_system: UnitSystem
  height_cm: number | null
  birth_date: string | null
}

export type DocumentType = 'receipt' | 'invoice' | 'bill' | 'other'
export type ExtractionSource = 'mock' | 'ai' | 'manual'

export interface Merchant {
  id: string
  user_id: string
  name: string
  normalized_name: string
  branch: string | null
  created_at: string
}

export interface Product {
  id: string
  user_id: string
  name: string
  normalized_name: string
  brand: string | null
  size_value: number | null
  size_unit: string | null
  created_at: string
}

export interface Receipt {
  id: string
  user_id: string
  expense_id: string
  merchant_id: string | null
  client_ref: string
  document_type: DocumentType | null
  image_url: string | null
  invoice_number: string | null
  issued_at: string | null
  due_at: string | null
  subtotal: number | null
  tax: number | null
  total: number | null
  currency: string
  extraction_confidence: number | null
  extraction_source: ExtractionSource | null
  raw_extraction: unknown | null
  created_at: string
}

export interface ReceiptItem {
  id: string
  user_id: string
  receipt_id: string
  product_id: string | null
  label: string
  quantity: number | null
  unit_price: number | null
  line_total: number | null
  discount: number | null
  category_id: string | null
  position: number | null
  created_at: string
}

export type PaymentMethodKind = 'bnpl' | 'credit_card' | 'debit_card' | 'cash' | 'bank_transfer'
export type CardNetwork = 'visa' | 'mastercard' | 'meeza' | 'amex'
export type InstallmentPlanStatus = 'active' | 'completed' | 'cancelled' | 'late'
export type InstallmentPaymentStatus = 'scheduled' | 'paid' | 'late' | 'skipped'

/**
 * A funding source — a BNPL account or a bank card. There is deliberately no
 * field for a full card number, CVV or PIN; see 20260826120000_installments.sql.
 * `credit_limit` is null when the user has not recorded one, which is not the
 * same as a limit of zero and must never be rendered as 0% utilisation.
 */
export interface PaymentMethod {
  id: string
  user_id: string
  kind: PaymentMethodKind
  provider_slug: string | null
  label: string
  network: CardNetwork | null
  issuer: string | null
  last4: string | null
  credit_limit: number | null
  currency: string
  statement_day: number | null
  due_day: number | null
  active: boolean
  created_at: string
}

export interface InstallmentPlan {
  id: string
  user_id: string
  payment_method_id: string
  expense_id: string | null
  receipt_id: string | null
  merchant_id: string | null
  description: string
  principal: number
  fees: number
  total_payable: number
  months: number
  monthly_amount: number
  started_on: string
  first_due_on: string
  status: InstallmentPlanStatus
  created_at: string
}

export interface InstallmentPayment {
  id: string
  user_id: string
  plan_id: string
  seq: number
  due_on: string
  amount: number
  paid_on: string | null
  paid_amount: number | null
  status: InstallmentPaymentStatus
  created_at: string
}

export interface PriceObservation {
  id: string
  user_id: string
  product_id: string
  merchant_id: string | null
  receipt_item_id: string
  unit_price: number
  normalized_unit_price: number | null
  normalized_unit: string | null
  observed_at: string
  currency: string | null
  created_at: string
}

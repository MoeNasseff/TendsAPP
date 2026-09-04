export interface ExpenseCategory {
  id: string
  user_id: string
  name: string
  color: string | null
  icon: string | null
  created_at: string
}

/**
 * What a row IS, as distinct from which way the money went.
 *
 * Only `purchase` is spending. A `transfer` — the account debit that settles a
 * credit card — is real money leaving a real account, but it pays off a
 * balance whose purchases were already counted individually; summing it too
 * double-counts every one of them. Analytics and budgets sum `purchase` alone.
 */
export type TransactionKind = 'purchase' | 'transfer' | 'card_payment' | 'refund' | 'withdrawal'

export interface Expense {
  id: string
  user_id: string
  category_id: string | null
  amount: number
  currency: string
  note: string | null
  spent_at: string
  kind: TransactionKind
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

export type ReminderSourceModule = 'dog' | 'car' | 'meds' | 'expense' | 'bill' | 'card' | 'installment' | 'inbox'
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
  /** Null for the pre-existing dog/car/meds branches, which keep their own
   *  created_at-window dedupe. Populated (and unique where non-null) for
   *  every type generate_reminders() added in S30a. */
  dedupe_key: string | null
  created_at: string
}

/** Matches tasks/s30-catalogue.md's own row IDs: 'A1'..'A3', 'B1'..'B9'. */
export type NotificationPrefType = `A${1 | 2 | 3}` | `B${1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9}`

export interface NotificationPref {
  id: string
  user_id: string
  type: NotificationPrefType
  enabled: boolean
  created_at: string
}

/** One row per user, created lazily by the /notifications page. Absent ⇒
 *  the catalogue's signed-off defaults apply (00:00-08:00, digest at 20:00). */
export interface NotificationSettings {
  user_id: string
  quiet_hours_start: string
  quiet_hours_end: string
  digest_hour: number
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

export type AccountBalanceSource = 'sms' | 'manual' | 'statement'

/**
 * One balance reading for a payment method — a debit account's cash or a
 * credit card's available limit, never both meaningfully at once. Append-only:
 * a method's current balance is its latest row by `observed_at`, not a value
 * ever updated in place. See 20260901000000_account_balances.sql for why
 * `balance` and `available_credit` are separate columns rather than one
 * reused for both.
 */
export interface AccountBalance {
  id: string
  user_id: string
  payment_method_id: string
  balance: number | null
  available_credit: number | null
  source: AccountBalanceSource
  observed_at: string
  sms_inbox_id: string | null
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

export type RecurringBillKind =
  | 'utility'
  | 'subscription'
  | 'service'
  | 'rent'
  | 'insurance'
  | 'loan'
  | 'other'
export type IntervalUnit = 'week' | 'month' | 'quarter' | 'year'
export type RecurringBillPaymentStatus = 'scheduled' | 'paid' | 'late' | 'skipped'

/**
 * A commitment that recurs — electricity, internet, the gardener, rent.
 * `amount` is null for a variable bill (electricity, water): storing a made-up
 * "typical" figure would put a fabricated number on the dashboard, so the UI
 * asks for the real one at pay time instead.
 */
export interface RecurringBill {
  id: string
  user_id: string
  name: string
  kind: RecurringBillKind
  merchant_id: string | null
  category_id: string | null
  payment_method_id: string | null
  amount: number | null
  is_variable: boolean
  currency: string
  interval_unit: IntervalUnit
  interval_count: number
  next_due_on: string
  active: boolean
  auto_pay: boolean
  note: string | null
  created_at: string
}

export interface RecurringBillPayment {
  id: string
  user_id: string
  bill_id: string
  expense_id: string | null
  due_on: string
  amount: number | null
  paid_on: string | null
  paid_amount: number | null
  status: RecurringBillPaymentStatus
  created_at: string
}

export type IngestSource = 'ios-automation' | 'share-sheet' | 'manual' | 'email'
export type InboxDirection = 'debit' | 'credit'
export type InboxParseMethod = 'regex' | 'ai' | 'none'
export type InboxMessageStatus = 'pending' | 'accepted' | 'rejected' | 'ignored' | 'unparsed'

/** A Shortcut's authentication credential — see sms-ingest. `token_hash` is
 *  the only form of the secret ever stored; the raw value is shown once. */
export interface IngestToken {
  id: string
  user_id: string
  token_hash: string
  label: string | null
  last_used_at: string | null
  revoked_at: string | null
  created_at: string
}

/**
 * One bank/payment text message, from ingestion through review. `raw_text`
 * is nullable so a future retention job can clear it while the parsed result
 * and the audit trail (received_at, status, expense_id) survive. Every
 * `parsed_*` field is null until a parser (regex or AI) has run, and stays
 * null forever on a row nothing could read.
 */
export interface InboxMessage {
  id: string
  user_id: string
  raw_text: string | null
  sender_label: string | null
  received_at: string
  source: IngestSource
  dedupe_hash: string
  parsed_amount: number | null
  parsed_currency: string | null
  parsed_direction: InboxDirection | null
  parsed_merchant_raw: string | null
  parsed_last4: string | null
  parsed_occurred_at: string | null
  parsed_balance: number | null
  parse_method: InboxParseMethod | null
  parse_confidence: number | null
  parser_version: string | null
  matched_merchant_id: string | null
  suggested_category_id: string | null
  suggested_payment_method_id: string | null
  matched_installment_plan_id: string | null
  /**
   * What the matched message shape says this is. Null means no deterministic
   * parser named a shape — an AI-parsed row, or one nothing could read — and
   * is a different claim from `'purchase'`: it says "no parser was confident",
   * not "this is spending". Null rows ask the user.
   */
  suggested_kind: TransactionKind | null
  /**
   * The other half of a card settlement — an account debit points at the
   * card-payment credit it funds, and that credit points back. Non-null is the
   * only condition under which a `transfer` is classified without asking: an
   * unpaired account debit is a genuine guess, because a transfer to a person
   * and real spending are textually identical.
   */
  paired_inbox_id: string | null
  status: InboxMessageStatus
  expense_id: string | null
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

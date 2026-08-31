import type { ReminderSourceModule } from './types'

/**
 * Maps a reminder's source module to its accent palette key in styles/moods.css.
 *
 * Note the mismatch this exists to absorb: the DB enum value is 'expense'
 * (singular), the mood/route key is 'expenses' (plural). Passing source_module
 * straight through to data-mood silently matches no rule and leaves the element
 * with an unresolved --mood-accent.
 *
 * bill/card/installment/inbox (added in S30a) have no mood of their own —
 * moods.css defines only expenses/dog/car/meds/body. They borrow 'expenses'
 * as the closest financial analog rather than inventing a new accent colour
 * from a backend-only session; a design pass can give them their own later.
 */
export const MOOD_BY_MODULE: Record<ReminderSourceModule, string> = {
  dog: 'dog',
  car: 'car',
  meds: 'meds',
  expense: 'expenses',
  bill: 'expenses',
  card: 'expenses',
  installment: 'expenses',
  inbox: 'expenses',
}

/** Tab name a reminder belongs to. Matches the labels in nav-items.ts. */
export const LABEL_BY_MODULE: Record<ReminderSourceModule, string> = {
  dog: 'Dog',
  car: 'Car',
  meds: 'Meds',
  expense: 'Expenses',
  bill: 'Bills',
  card: 'Card',
  installment: 'Instalment',
  inbox: 'Inbox',
}

import type { ReminderSourceModule } from './types'

/**
 * Maps a reminder's source module to its accent palette key in styles/moods.css.
 *
 * Note the mismatch this exists to absorb: the DB enum value is 'expense'
 * (singular), the mood/route key is 'expenses' (plural). Passing source_module
 * straight through to data-mood silently matches no rule and leaves the element
 * with an unresolved --mood-accent.
 */
export const MOOD_BY_MODULE: Record<ReminderSourceModule, string> = {
  dog: 'dog',
  car: 'car',
  meds: 'meds',
  expense: 'expenses',
}

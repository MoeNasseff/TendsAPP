import type { MeasurementSite, Sex } from '../../lib/types'

/**
 * Where each measurement sits on the figure, and which side its input box goes.
 *
 * Anchors are in the figure's SVG viewBox coordinates (200 x 420). Input boxes
 * are positioned from the same numbers as a percentage of height, so the leader
 * line and its box stay aligned at any size without measuring the DOM.
 */
export interface SiteDef {
  key: MeasurementSite
  label: string
  /** Which column the input box sits in. */
  side: 'left' | 'right'
  /** Anchor on the figure, in viewBox units. */
  x: number
  y: number
  /** Restricts the site to one figure. Omitted means both. */
  only?: Sex
  hint?: string
}

export const VIEWBOX = { width: 200, height: 420 }

/**
 * Sides alternate down the body so leader lines never cross, and limb sites all
 * sit left where the arm is drawn.
 */
export const SITES: SiteDef[] = [
  { key: 'neck', label: 'Neck', side: 'right', x: 100, y: 60, hint: 'Around the base' },
  { key: 'shoulder', label: 'Shoulder', side: 'left', x: 100, y: 82, hint: 'Point to point' },
  { key: 'chest', label: 'Chest', side: 'right', x: 100, y: 108, only: 'male' },
  { key: 'bust', label: 'Bust', side: 'right', x: 100, y: 108, only: 'female', hint: 'Fullest point' },
  { key: 'underbust', label: 'Underbust', side: 'right', x: 100, y: 128, only: 'female' },
  { key: 'upper_arm', label: 'Upper arm', side: 'left', x: 58, y: 116, hint: 'Bicep, relaxed' },
  { key: 'waist', label: 'Waist', side: 'right', x: 100, y: 150, hint: 'Narrowest point' },
  { key: 'forearm', label: 'Forearm', side: 'left', x: 48, y: 152 },
  { key: 'belly', label: 'Belly', side: 'right', x: 100, y: 170, hint: 'At the navel' },
  { key: 'wrist', label: 'Wrist', side: 'left', x: 42, y: 186 },
  { key: 'hips', label: 'Hips', side: 'right', x: 100, y: 196, hint: 'Fullest point' },
  { key: 'inseam', label: 'Inseam', side: 'left', x: 100, y: 232, hint: 'Crotch to floor' },
  { key: 'thigh', label: 'Thigh', side: 'right', x: 122, y: 258 },
  { key: 'calf', label: 'Calf', side: 'left', x: 78, y: 330 },
]

/** Sites shown for a figure — bust and underbust are female, chest is male. */
export function sitesFor(sex: Sex): SiteDef[] {
  return SITES.filter((s) => !s.only || s.only === sex)
}

import type { Clip } from './animationTypes'

/**
 * Named animations, defined as slices of the generated strips.
 *
 * Several named states share one strip rather than getting their own file. The
 * pill spill is a single 30-frame narrative, so its six phases are frame ranges
 * into one image instead of six images repeating the same pixels.
 *
 * Where a requested state has no matching art, that is called out rather than
 * quietly aliased to something unrelated — see the dog and car notes below.
 */

/* ----------------------------- Dog ----------------------------- */

export const DOG = {
  walk: { sheet: 'dog-walk', fps: 10, loop: true },
  run: { sheet: 'dog-run', fps: 14, loop: true },
  sit: { sheet: 'dog-sit', fps: 4, loop: true },
  tailWag: { sheet: 'dog-tailWag', fps: 12, loop: true, direction: 'pingpong' },
  turn: { sheet: 'dog-turn', fps: 8, loop: false },
  jump: { sheet: 'dog-jump', fps: 12, loop: false },
  play: { sheet: 'dog-play', fps: 8, loop: true },

  /**
   * The sheet has no idle or sleep art. Idle holds the sitting pose and breathes
   * slowly through its three frames, which reads as settled rather than frozen.
   * Sleep is the last sitting frame held still — the honest best available.
   */
  idle: { sheet: 'dog-sit', fps: 2, loop: true, direction: 'pingpong' },
  sleep: { sheet: 'dog-sit', from: 2, to: 2, fps: 1, loop: false },
} satisfies Record<string, Clip>

/**
 * Poses the idle dog picks between. Weighted towards stillness so the dog is
 * calm decoration rather than a constantly moving distraction.
 */
export const DOG_IDLE_POSES: ReadonlyArray<{ clip: Clip; weight: number; ms: [number, number] }> = [
  { clip: DOG.idle, weight: 5, ms: [6000, 12000] },
  { clip: DOG.sit, weight: 3, ms: [5000, 9000] },
  { clip: DOG.tailWag, weight: 3, ms: [3000, 6000] },
  { clip: DOG.sleep, weight: 2, ms: [8000, 16000] },
  { clip: DOG.jump, weight: 1, ms: [1500, 2500] },
  { clip: DOG.play, weight: 1, ms: [3000, 5000] },
]

/* ---------------------------- Money ---------------------------- */

/**
 * One 20-frame sheet of bend and flutter poses. The three requested money
 * states are different readings of it rather than different art: float drifts
 * gently through every pose, spin runs the full cycle fast, drift ambles
 * through a subset.
 */
export const MONEY = {
  float: { sheet: 'money-flutter', fps: 8, loop: true, direction: 'pingpong' },
  spin: { sheet: 'money-flutter', fps: 18, loop: true },
  drift: { sheet: 'money-flutter', from: 4, to: 15, fps: 6, loop: true, direction: 'pingpong' },
} satisfies Record<string, Clip>

/* ---------------------------- Pills ---------------------------- */

/** Phases of the single continuous spill, as ranges into pills-spill. */
export const PILLS = {
  bottleStanding: { sheet: 'pills-spill', from: 0, to: 0, fps: 1, loop: false },
  bottleFalling: { sheet: 'pills-spill', from: 1, to: 3, fps: 12, loop: false },
  capFlying: { sheet: 'pills-spill', from: 4, to: 6, fps: 12, loop: false },
  pillsPouring: { sheet: 'pills-spill', from: 7, to: 15, fps: 14, loop: false },
  pillsScattering: { sheet: 'pills-spill', from: 16, to: 23, fps: 12, loop: false },
  pillsSettling: { sheet: 'pills-spill', from: 24, to: 29, fps: 8, loop: false },
  /** The whole thing, start to rest, as one clip. */
  spill: { sheet: 'pills-spill', fps: 12, loop: false },
} satisfies Record<string, Clip>

/* ----------------------------- Car ------------------------------ */

/**
 * The car sheet is a product-render catalogue, not an animation. Frames 7-12
 * are one unchanging side profile and no frame contains a person, so a drive
 * cycle and "driver exits" cannot be built from it. What follows is the subset
 * that genuinely animates.
 *
 * Requested but absent: carIdle (no idle cycle — use a still headlight frame),
 * carBrake (no brake-light-only frame), driverExits (no driver anywhere).
 */
export const CAR = {
  headlightsOff: { sheet: 'car-headlights', from: 0, to: 0, fps: 1, loop: false },
  headlightsOn: { sheet: 'car-headlights', from: 1, to: 1, fps: 1, loop: false },
  /** Off, on, daytime-running — played as a blink. */
  headlightsBlink: { sheet: 'car-headlights', fps: 6, loop: true, direction: 'pingpong' },
  doorOpen: { sheet: 'car-doors', fps: 10, loop: false },
  doorClose: { sheet: 'car-doors', fps: 10, loop: false, direction: 'reverse' },
  hoodOpen: { sheet: 'car-hood', fps: 8, loop: false },
  hoodClose: { sheet: 'car-hood', fps: 8, loop: false, direction: 'reverse' },
  /** Two sharp side views into two motion-blurred ones. */
  driving: { sheet: 'car-driveBlur', fps: 10, loop: true },
} satisfies Record<string, Clip>

export const CLIPS = { ...DOG, ...MONEY, ...PILLS, ...CAR }

import type { PlayDirection, SpriteSheetMeta } from './animationTypes'

/**
 * Pure helpers for the sprite runtime. Kept free of DOM and React so the frame
 * maths can be reasoned about (and tested) on its own.
 */

/**
 * Background offset for a frame, in CSS pixels.
 *
 * Frames are stepped with `background-position` rather than by moving the image
 * with `left`/`top`, so the browser never reflows — only the paint changes.
 * Grid-wrapped strips need both axes, hence the row maths.
 */
export function frameOffset(index: number, meta: SpriteSheetMeta) {
  const col = index % meta.columns
  const row = Math.floor(index / meta.columns)
  return { x: -col * meta.frameWidth, y: -row * meta.frameHeight }
}

/**
 * Frame index for a point in time.
 *
 * Derived from elapsed time rather than incremented per tick, so playback runs
 * at the same speed regardless of display refresh rate — a 144Hz monitor shows
 * the same animation as a 60Hz one, and a dropped frame does not cause drift.
 */
export function frameAt(
  elapsedMs: number,
  opts: { total: number; fps: number; speed: number; loop: boolean; direction: PlayDirection },
): { index: number; finished: boolean } {
  const { total, fps, speed, loop, direction } = opts
  if (total <= 1) return { index: 0, finished: true }

  const step = Math.floor((elapsedMs * fps * speed) / 1000)
  // A ping-pong cycle walks up and back down without repeating either end,
  // so it is 2n-2 steps long rather than 2n.
  const cycle = direction === 'pingpong' ? total * 2 - 2 : total

  if (!loop && step >= cycle - 1) {
    const last = direction === 'reverse' ? 0 : total - 1
    return { index: direction === 'pingpong' ? 0 : last, finished: true }
  }

  const pos = step % cycle
  if (direction === 'reverse') return { index: total - 1 - pos, finished: false }
  if (direction === 'pingpong') {
    return { index: pos < total ? pos : cycle - pos, finished: false }
  }
  return { index: pos, finished: false }
}

/**
 * Whether the user asked for reduced motion.
 *
 * Read live rather than cached, so toggling the OS setting takes effect without
 * a reload. Guarded for non-browser environments.
 */
export function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

/** Random float in [min, max). Used to keep spawned decorations irregular. */
export function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min)
}

/** Random element of a non-empty array. */
export function randomOf<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)]
}

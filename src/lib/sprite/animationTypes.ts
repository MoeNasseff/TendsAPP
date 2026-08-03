import manifest from '../../assets/sprites/sprites.json'

/** Geometry of one generated strip, as written by scripts/gen-sprites.ts. */
export interface SpriteSheetMeta {
  src: string
  frames: number
  frameWidth: number
  frameHeight: number
  /**
   * Cells per row. Strips are a single row unless that would exceed WebP's
   * 16383px limit, in which case the generator wraps them into a grid.
   */
  columns: number
}

/**
 * Sheet names come from the generated manifest, so a typo is a type error and
 * deleting a sheet breaks the build rather than failing silently at runtime.
 */
export type SpriteSheetId = keyof typeof manifest

export const SHEETS = manifest as Record<SpriteSheetId, SpriteSheetMeta>

/** forward: 0..n. reverse: n..0. pingpong: 0..n..0 without repeating the ends. */
export type PlayDirection = 'forward' | 'reverse' | 'pingpong'

/** A named animation: a sheet, optionally a slice of it, and a play rate. */
export interface Clip {
  sheet: SpriteSheetId
  /** Inclusive frame range within the sheet. Defaults to the whole sheet. */
  from?: number
  to?: number
  fps: number
  loop?: boolean
  direction?: PlayDirection
}

export interface SpriteAnimatorProps {
  /** A sheet id, or a Clip for a named slice of one. */
  image: SpriteSheetId | Clip
  /** Overrides the frame count. Rarely needed — the manifest already knows. */
  frames?: number
  fps?: number
  loop?: boolean
  autoplay?: boolean
  /** Convenience for `direction="reverse"`. */
  reverse?: boolean
  /** Multiplies the rendered size. 1 renders at the generated cell size. */
  scale?: number
  /** Multiplies playback rate. 2 is twice as fast; does not change `fps`. */
  speed?: number
  direction?: PlayDirection
  /** Pause while the tab is hidden or the window is minimised. Default true. */
  pauseWhenHidden?: boolean
  /** Pause while scrolled out of view. Default true. */
  pauseWhenOffscreen?: boolean
  /** Fired when a non-looping clip reaches its final frame. */
  onFinished?: () => void
  className?: string
  style?: React.CSSProperties
}

import { useCallback, useEffect, useRef } from 'react'
import {
  SHEETS,
  type Clip,
  type PlayDirection,
  type SpriteSheetId,
  type SpriteSheetMeta,
} from '../lib/sprite/animationTypes'
import { frameAt, frameOffset, prefersReducedMotion } from '../lib/sprite/spriteUtils'

/**
 * The sprite playback engine.
 *
 * Deliberately holds no React state: a 16fps animation would otherwise rerender
 * its subtree 16 times a second for a purely visual change. Frames are written
 * straight to the element's style through a ref, so React renders each animator
 * once and never again while it plays.
 */

/* ------------------------------------------------------------------ *
 * Shared frame driver
 *
 * One requestAnimationFrame loop for every animator on the page rather than one
 * each. Ten animators would otherwise mean ten independent callbacks competing
 * in the same 16ms budget. The loop stops itself when the last subscriber
 * leaves, so an idle page schedules no work at all.
 * ------------------------------------------------------------------ */

type Ticker = (now: number) => void
const subscribers = new Set<Ticker>()
let rafId = 0

function frame(now: number) {
  for (const fn of subscribers) fn(now)
  rafId = subscribers.size ? requestAnimationFrame(frame) : 0
}

function subscribe(fn: Ticker): () => void {
  subscribers.add(fn)
  if (!rafId) rafId = requestAnimationFrame(frame)
  return () => {
    subscribers.delete(fn)
    if (!subscribers.size && rafId) {
      cancelAnimationFrame(rafId)
      rafId = 0
    }
  }
}

/* ------------------------------------------------------------------ *
 * Shared visibility + intersection observers
 *
 * Browsers already stop firing rAF for a hidden tab, so playback halts on its
 * own. What that does not solve is the clock: on return, elapsed time would
 * have jumped by however long the tab was away and the animation would snap
 * forward. Instances listen here so they can rebase their clock instead.
 * ------------------------------------------------------------------ */

const visibilityListeners = new Set<() => void>()

function onVisibilityChange(fn: () => void): () => void {
  if (!visibilityListeners.size) {
    document.addEventListener('visibilitychange', notifyVisibility)
  }
  visibilityListeners.add(fn)
  return () => {
    visibilityListeners.delete(fn)
    if (!visibilityListeners.size) {
      document.removeEventListener('visibilitychange', notifyVisibility)
    }
  }
}

function notifyVisibility() {
  for (const fn of visibilityListeners) fn()
}

/** One IntersectionObserver shared by every animator, keyed by element. */
const intersectionCallbacks = new WeakMap<Element, (visible: boolean) => void>()
let observer: IntersectionObserver | null = null

function getObserver(): IntersectionObserver {
  observer ??= new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        intersectionCallbacks.get(entry.target)?.(entry.isIntersecting)
      }
    },
    // A small margin starts the animation just before it scrolls into view, so
    // it is already moving by the time it is visible.
    { rootMargin: '64px' },
  )
  return observer
}

/* ------------------------------------------------------------------ *
 * Lazy sheet loading
 *
 * Vite turns this glob into one chunk per strip, fetched on demand. A page that
 * only shows the dog never downloads the car or the pills, and a page with no
 * animation downloads none of them.
 * ------------------------------------------------------------------ */

const sheetUrls = import.meta.glob<string>('../assets/sprites/*.webp', {
  query: '?url',
  import: 'default',
})

const urlCache = new Map<string, string>()

async function loadSheet(src: string): Promise<string> {
  const cached = urlCache.get(src)
  if (cached) return cached
  const loader = sheetUrls[`../assets/sprites/${src}`]
  if (!loader) throw new Error(`sprite sheet not found: ${src}`)
  const url = await loader()
  urlCache.set(src, url)
  return url
}

export interface UseSpriteAnimationOptions {
  image: SpriteSheetId | Clip
  fps?: number
  loop?: boolean
  autoplay?: boolean
  speed?: number
  direction?: PlayDirection
  pauseWhenHidden?: boolean
  pauseWhenOffscreen?: boolean
  onFinished?: () => void
}

export interface SpriteHandle {
  /** Attach to the element that should display the animation. */
  ref: (node: HTMLElement | null) => void
  meta: SpriteSheetMeta
  /** Frames in the resolved clip, which may be a slice of the sheet. */
  total: number
  play: () => void
  pause: () => void
}

export function useSpriteAnimation(opts: UseSpriteAnimationOptions): SpriteHandle {
  const clip: Clip = typeof opts.image === 'string' ? { sheet: opts.image, fps: 12 } : opts.image
  const meta = SHEETS[clip.sheet]

  const from = clip.from ?? 0
  const to = clip.to ?? meta.frames - 1
  const total = to - from + 1

  const fps = opts.fps ?? clip.fps
  const loop = opts.loop ?? clip.loop ?? true
  const direction = opts.direction ?? clip.direction ?? 'forward'
  const speed = opts.speed ?? 1
  const autoplay = opts.autoplay ?? true
  const pauseWhenHidden = opts.pauseWhenHidden ?? true
  const pauseWhenOffscreen = opts.pauseWhenOffscreen ?? true

  const nodeRef = useRef<HTMLElement | null>(null)
  // Live values the ticker reads without being torn down and rebuilt.
  const cfg = useRef({ from, total, fps, loop, direction, speed })
  cfg.current = { from, total, fps, loop, direction, speed }

  const onFinishedRef = useRef(opts.onFinished)
  onFinishedRef.current = opts.onFinished

  /** Playback clock. Held in refs so ticking never touches React. */
  const clock = useRef({ startedAt: 0, elapsed: 0, running: false, done: false })
  /** Reasons playback is currently suspended; playback runs only when all clear. */
  const gates = useRef({ wanted: autoplay, offscreen: false, hidden: false })
  const unsubscribe = useRef<(() => void) | null>(null)

  const paint = useCallback(
    (index: number) => {
      const node = nodeRef.current
      if (!node) return
      const { x, y } = frameOffset(index, meta)
      node.style.backgroundPosition = `${x}px ${y}px`
    },
    [meta],
  )

  const tick = useCallback(
    (now: number) => {
      const c = clock.current
      if (!c.running) return
      if (!c.startedAt) c.startedAt = now
      c.elapsed = now - c.startedAt

      const { from: start, total: count, fps: rate, loop: repeat, direction: dir, speed: rateMul } =
        cfg.current
      const { index, finished } = frameAt(c.elapsed, {
        total: count,
        fps: rate,
        speed: rateMul,
        loop: repeat,
        direction: dir,
      })
      paint(start + index)

      if (finished && !c.done) {
        c.done = true
        c.running = false
        onFinishedRef.current?.()
      }
    },
    [paint],
  )

  /**
   * Cancels the live subscription and halts the clock.
   *
   * Kept as a stable callback rather than inlined into effect cleanups: the
   * teardown has to act on whichever subscription is current at that moment,
   * and reading a ref inside a cleanup is both flagged by lint and easy to get
   * wrong by capturing a stale value.
   */
  const stop = useCallback(() => {
    unsubscribe.current?.()
    unsubscribe.current = null
    clock.current.running = false
  }, [])

  /** Starts or stops the subscription to match the gates. */
  const sync = useCallback(() => {
    const g = gates.current
    const c = clock.current
    const shouldRun = g.wanted && !c.done && !g.offscreen && !g.hidden

    if (shouldRun && !c.running) {
      c.running = true
      // Rebase the clock so time spent paused is not counted. Without this a
      // tab left in the background for a minute would snap far forward.
      c.startedAt = 0
      const resumeFrom = c.elapsed
      const unsub = subscribe((now) => {
        if (!clock.current.startedAt) clock.current.startedAt = now - resumeFrom
        tick(now)
      })
      unsubscribe.current?.()
      unsubscribe.current = unsub
    } else if (!shouldRun && c.running) {
      c.running = false
      unsubscribe.current?.()
      unsubscribe.current = null
    }
  }, [tick])

  const ref = useCallback(
    (node: HTMLElement | null) => {
      const previous = nodeRef.current
      if (previous) {
        intersectionCallbacks.delete(previous)
        getObserver().unobserve(previous)
      }
      nodeRef.current = node
      if (!node) return

      // Only per-frame properties are written here. Size and the rest stay in
      // the component's style prop, so React and this ref never write the same
      // property and fight each other across rerenders.
      paint(from)

      if (pauseWhenOffscreen) {
        intersectionCallbacks.set(node, (visible) => {
          gates.current.offscreen = !visible
          sync()
        })
        getObserver().observe(node)
      }
    },
    [from, paint, pauseWhenOffscreen, sync],
  )

  // Load the strip and attach it. Kept out of render so a missing sheet cannot
  // block paint, and so the URL resolves lazily per sheet.
  useEffect(() => {
    let cancelled = false
    loadSheet(meta.src).then((url) => {
      if (cancelled || !nodeRef.current) return
      nodeRef.current.style.backgroundImage = `url(${url})`
    })
    return () => {
      cancelled = true
    }
  }, [meta.src])

  useEffect(() => {
    // Reduced motion is honoured by showing a single still frame and never
    // subscribing to the driver at all.
    if (prefersReducedMotion()) {
      paint(from)
      return
    }

    gates.current.wanted = autoplay
    gates.current.hidden = pauseWhenHidden && document.hidden
    sync()

    const offVisibility = pauseWhenHidden
      ? onVisibilityChange(() => {
          gates.current.hidden = document.hidden
          sync()
        })
      : undefined

    return () => {
      offVisibility?.()
      stop()
    }
  }, [autoplay, pauseWhenHidden, sync, paint, from, stop])

  // No unmount effect is needed to release the observer: React invokes the ref
  // callback with null when the element goes away, and that path already
  // unobserves the previous node, so detached nodes are never retained.

  const play = useCallback(() => {
    clock.current.done = false
    gates.current.wanted = true
    sync()
  }, [sync])

  const pause = useCallback(() => {
    gates.current.wanted = false
    sync()
  }, [sync])

  return { ref, meta, total, play, pause }
}

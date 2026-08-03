# Sprite animation system

Decorative frame animation for TendsApp. Everything here is presentational —
no business logic, no layout changes to existing pages.

## Using it

```tsx
<SpriteAnimator image="dog-walk" fps={12} />
```

That is the whole contract for a new sheet. Frame size, frame count and grid
layout come from the generated manifest, so nothing about the art is repeated
at a call site or hardcoded anywhere in the runtime.

Named animations live in `lib/sprite/animations.ts` and are usually what you
want, since they carry sensible rates and loop settings:

```tsx
import { DOG, PILLS } from '../../lib/sprite/animations'

<SpriteAnimator image={DOG.run} scale={0.45} />
<SpriteAnimator image={PILLS.spill} onFinished={handleSettled} />
```

### Props

| Prop | Default | Notes |
|---|---|---|
| `image` | — | Sheet id, or a `Clip` for a named slice of one |
| `frames` | whole sheet | Narrows to the first N frames |
| `fps` | clip's rate | |
| `loop` | `true` | |
| `autoplay` | `true` | |
| `reverse` | `false` | Sugar for `direction="reverse"`; loses to explicit `direction` |
| `scale` | `1` | Transform-based, so it does not affect layout |
| `speed` | `1` | Rate multiplier, independent of `fps` |
| `direction` | `forward` | `forward` · `reverse` · `pingpong` |
| `pauseWhenHidden` | `true` | |
| `pauseWhenOffscreen` | `true` | |
| `onFinished` | — | Fires on the last frame of a non-looping clip |

## Files

| File | Role |
|---|---|
| `SpriteAnimator.tsx` | The component |
| `IdleDog.tsx` · `MoneyField.tsx` · `PillSpill.tsx` | Composed behaviours |
| `hooks/useSpriteAnimation.ts` | Playback engine |
| `lib/sprite/spriteUtils.ts` | Pure frame maths |
| `lib/sprite/animations.ts` | Named clips |
| `lib/sprite/animationTypes.ts` | Types, manifest-derived sheet ids |
| `scripts/gen-sprites.ts` | Build-time asset pipeline |

## Design decisions

**No React state during playback.** A 16fps animation would otherwise rerender
its subtree 16 times a second for a purely visual change. Frames are written
straight to `background-position` through a ref, so each animator renders once
and never again while it plays.

**One `requestAnimationFrame` loop for the whole page.** Ten animators would
otherwise mean ten callbacks competing in the same 16ms budget. The shared
driver stops itself when the last subscriber leaves, so an idle page schedules
no work at all.

**Frames derived from elapsed time, not incremented per tick.** Playback runs at
the same speed on a 144Hz display as on a 60Hz one, and a dropped frame causes
no drift.

**`background-position`, never `left`/`top`.** Stepping frames changes paint
only, never layout. Movement across the screen uses `translate3d`, which keeps
the element on its own compositor layer.

**Pausing.** Browsers already stop firing rAF in a hidden tab, so playback halts
by itself. What that does not solve is the clock: on return, elapsed time would
have jumped by however long the tab was away. Instances listen for
`visibilitychange` and rebase their clock instead. `IntersectionObserver` (one,
shared) does the same for off-screen animations.

**Reduced motion.** With `prefers-reduced-motion: reduce`, a single still frame
is painted and the driver is never subscribed to.

**Accessibility.** Every animator is `aria-hidden` with `pointer-events: none`.
They are decorative, never focusable, and cannot swallow a click or interfere
with keyboard navigation.

**Lazy loading.** `import.meta.glob` gives one chunk per strip, fetched on
demand. A page showing only the dog never downloads the car or the pills. The
strips are deliberately not precached by the service worker, so they cost the
PWA install ~16KiB of URL chunks rather than the full 732KiB of imagery.

## Regenerating the art

```
npm run gen-sprites
```

Not wired into `prebuild`. The source sheets live in Git LFS and the deploy
build must not depend on fetching them — the generated strips are committed.

The source art is a set of *labelled contact sheets*, not sprite sheets: caption
numbers and section headers are baked into the pixels, rows hold different
numbers of frames, spacing is uneven, and backgrounds are opaque near-white. The
pipeline therefore:

1. keys the background out by flooding inward from the borders, so interior
   whites — the dog's chest, the white pills, the car's number plate — survive
   where a brightness threshold would have punched them out
2. finds bands of content and discards the short ones, which are the captions
   and section headers
3. splits each row at the midpoints between caption centres. The captions are
   the reliable anchor: there is exactly one per frame, centred beneath it.
   Segmenting on the subjects themselves fails, because dogs in a walk cycle
   overlap and merge while a pill bottle and its flying cap are one frame in two
   pieces
4. erases fragments bleeding across a boundary, but only when they touch a frame
   edge *and* are small — which removes neighbour slivers while keeping the
   detached cap
5. trims, normalises to one cell size per state, and emits WebP plus a manifest

Verification overlays are written to `assets/images/sprites/_verify/` so the
segmentation can be checked by eye rather than trusted. Check them after any
change to the source art.

## What the art does not support

The brief asked for states the source material does not contain. Rather than
alias them to something unrelated:

- **Dog idle / sleep** — no such frames. Idle breathes slowly through the
  sitting poses; sleep holds the last sitting frame.
- **Car driving / brake / driver exits** — the car sheet is a product-render
  catalogue. Frames 7–12 are one unchanging side profile and no frame contains a
  person. Only headlight blink, the door sequence, the hood sequence and a
  two-frame motion-blur suggestion are real.

Also note the frame counts in the source filenames are wrong: the dog sheet has
32 frames, not 35 (captions skip 7, 13 and 18), and the car sheet has 36 images,
not 30.

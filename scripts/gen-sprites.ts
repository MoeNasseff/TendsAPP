/**
 * Turns the supplied sprite *contact sheets* into clean, uniform sprite strips.
 *
 * The source art in assets/images/sprites is not machine-sliceable: caption
 * numbers and section headers are baked into the pixels, rows hold different
 * numbers of frames, spacing between frames is uneven, and the backgrounds are
 * opaque near-white rather than transparent. Dividing width by a frame count
 * — the usual approach — slices captions and half-subjects into frames. So the
 * segmentation is done by looking at the pixels instead:
 *
 *   1. key the background out by flood-filling inward from the borders
 *   2. find horizontal bands of content, discarding the short ones (captions
 *      and section headers are their own bands, far shorter than a sprite row)
 *   3. split each band into frames at the widest vertical gaps
 *   4. trim every frame to its own content, then normalise to one cell size
 *   5. emit a horizontal strip per state, plus a manifest of frame counts and
 *      cell dimensions for the runtime to read
 *
 * Run manually with `npm run gen-sprites` after changing the source art. It is
 * deliberately NOT wired into prebuild: the raw sheets live in Git LFS, and the
 * deploy build must not depend on fetching them.
 */
import { mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import sharp from 'sharp'

const root = resolve(import.meta.dirname, '..')
const outDir = resolve(root, 'src/assets/sprites')
/**
 * Verification overlays go beside the source art, never into src/ — anything
 * under src/assets is fair game for the bundler, and these are review-only.
 */
const verifyDir = resolve(root, 'assets/images/sprites/_verify')

/** Where a state's frames sit in the sheet, as inclusive indices in reading order. */
type Range = [number, number]

interface SheetConfig {
  src: string
  /**
   * Expected frame count for each sprite band, top to bottom. Needed because
   * frames can break into several disconnected pieces — a pill bottle and its
   * flying cap are one frame but two blobs — so the splitter has to be told
   * how many frames a band really holds rather than counting blobs.
   */
  rows: number[]
  /**
   * bottom: subjects rest on a common ground line (characters, vehicles).
   * center: subjects float freely (banknotes).
   */
  align: 'bottom' | 'center'
  /** Output cell height in px. Frames are downscaled to this. */
  cellHeight: number
  /**
   * Ceiling on cell width. Some frames are far wider than they are tall — the
   * settled pill scatter is ~3.4:1 — and scaling those by height alone yields
   * enormous cells. Defaults to twice the cell height.
   */
  cellMaxWidth?: number
  states: Record<string, Range>
}

/**
 * Frame indices below are reading order within each sheet, NOT the caption
 * numbers printed on the art — the dog sheet skips 7, 13 and 18, so its
 * captions run to 35 while only 32 frames exist.
 */
const SHEETS: Record<string, SheetConfig> = {
  dog: {
    src: 'bernese/bernese-sprite-35.png',
    rows: [12, 12, 8],
    align: 'bottom',
    cellHeight: 200,
    states: {
      walk: [0, 5],
      run: [6, 11],
      sit: [12, 14],
      tailWag: [15, 19],
      turn: [20, 23],
      jump: [24, 28],
      play: [29, 31],
    },
  },
  money: {
    src: 'money/money100-sprite-20.png',
    rows: [5, 5, 5, 5],
    align: 'center',
    cellHeight: 120,
    states: { flutter: [0, 19] },
  },
  pills: {
    src: 'pills/pills-bottle-spill-sprite-30.png',
    rows: [8, 8, 8, 6],
    align: 'bottom',
    cellHeight: 180,
    cellMaxWidth: 320,
    // Emitted as a single strip rather than one file per phase. The phases are
    // consecutive slices of one continuous spill and are always played in
    // order, so splitting them would duplicate pixels across six files and add
    // six requests. The named phases live in animations.ts as frame ranges.
    states: { spill: [0, 29] },
  },
  car: {
    src: 'ateca/seat-ateca-2017-black-sprite-30.png',
    rows: [6, 6, 6, 6, 6, 6],
    align: 'bottom',
    cellHeight: 150,
    // Only the subsets that genuinely animate. This sheet is a product-render
    // catalogue: frames 7-12 are one unchanging side profile, and no frame
    // contains a driver, so a drive cycle and "driver exits" are not in here.
    states: {
      headlights: [2, 4], // off -> on -> daytime running
      doors: [24, 29],
      hood: [30, 32],
      driveBlur: [18, 21], // two sharp side views, then two motion-blurred
    },
  },
}

interface Mask {
  width: number
  height: number
  /** Per-pixel alpha after background keying, 0-255. */
  alpha: Uint8Array
  /** Source RGB, straight from the sheet. */
  rgb: Buffer
}

/**
 * Removes the background by flooding inward from the image borders.
 *
 * A plain brightness threshold would also erase the dog's white chest, the
 * white pills and the car's number plate. The background is the region
 * *connected to the edges*, so a flood fill keeps interior whites intact.
 * Pixels are faded out over a ramp rather than cut at a hard threshold, which
 * preserves anti-aliased edges and the soft contact shadows.
 */
async function keyBackground(path: string): Promise<Mask> {
  const { data, info } = await sharp(path)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  const { width, height } = info
  const at = (x: number, y: number) => (y * width + x) * 4

  // Background colour taken from a corner; all four sheets are uniform there.
  const bg = [data[at(1, 1)], data[at(1, 1) + 1], data[at(1, 1) + 2]]
  const dist = (i: number) =>
    Math.max(
      Math.abs(data[i] - bg[0]),
      Math.abs(data[i + 1] - bg[1]),
      Math.abs(data[i + 2] - bg[2]),
    )

  const NEAR = 10 // fully background at or below this distance
  const FAR = 42 // fully subject at or above it

  const alpha = new Uint8Array(width * height).fill(255)
  const seen = new Uint8Array(width * height)
  const stack: number[] = []

  const push = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return
    const p = y * width + x
    if (seen[p]) return
    if (dist(p * 4) >= FAR) return // hit the subject, stop travelling
    seen[p] = 1
    stack.push(p)
  }

  for (let x = 0; x < width; x++) {
    push(x, 0)
    push(x, height - 1)
  }
  for (let y = 0; y < height; y++) {
    push(0, y)
    push(width - 1, y)
  }

  while (stack.length) {
    const p = stack.pop()!
    const d = dist(p * 4)
    // Ramp instead of a hard cut, so edges and shadows fade rather than clip.
    alpha[p] = d <= NEAR ? 0 : Math.round(((d - NEAR) / (FAR - NEAR)) * 255)
    const x = p % width
    const y = (p / width) | 0
    push(x + 1, y)
    push(x - 1, y)
    push(x, y + 1)
    push(x, y - 1)
  }

  const rgb = Buffer.alloc(width * height * 3)
  for (let p = 0; p < width * height; p++) {
    rgb[p * 3] = data[p * 4]
    rgb[p * 3 + 1] = data[p * 4 + 1]
    rgb[p * 3 + 2] = data[p * 4 + 2]
  }
  return { width, height, alpha, rgb }
}

const SOLID = 32 // alpha above which a pixel counts as content

type Band = [number, number]

/** Every maximal run of rows containing content, tall and short alike. */
function findBands(mask: Mask): Band[] {
  const { width, height, alpha } = mask
  const rowHas: boolean[] = []
  for (let y = 0; y < height; y++) {
    let n = 0
    for (let x = 0; x < width; x++) if (alpha[y * width + x] > SOLID) n++
    // A few stray pixels are noise from shadow ramps, not content.
    rowHas[y] = n > 3
  }

  const bands: Band[] = []
  let start = -1
  for (let y = 0; y <= height; y++) {
    if (y < height && rowHas[y]) {
      if (start < 0) start = y
    } else if (start >= 0) {
      bands.push([start, y - 1])
      start = -1
    }
  }
  return bands
}

/**
 * Pairs each sprite row with the caption row underneath it.
 *
 * Sprite rows are several times taller than the caption and section-header
 * rows, so height alone classifies them. Headers sit above a sprite row and
 * captions below, hence the "next short band after a tall one" rule.
 */
function pairRows(bands: Band[]): Array<{ sprites: Band; captions: Band | null }> {
  const tallest = Math.max(...bands.map(([a, b]) => b - a + 1))
  const isTall = (b: Band) => b[1] - b[0] + 1 >= tallest * 0.35

  const out: Array<{ sprites: Band; captions: Band | null }> = []
  for (let i = 0; i < bands.length; i++) {
    if (!isTall(bands[i])) continue
    const next = bands[i + 1]
    out.push({
      sprites: bands[i],
      captions: next && !isTall(next) ? next : null,
    })
  }
  return out
}

/** Horizontal runs of content within a row, as [start, end] column pairs. */
function blobsIn(mask: Mask, band: Band): Band[] {
  const { width, alpha } = mask
  const blobs: Band[] = []
  let start = -1
  for (let x = 0; x <= width; x++) {
    let n = 0
    if (x < width) for (let y = band[0]; y <= band[1]; y++) if (alpha[y * width + x] > SOLID) n++
    if (n > 0) {
      if (start < 0) start = x
    } else if (start >= 0) {
      blobs.push([start, x - 1])
      start = -1
    }
  }
  return blobs
}

/** Merges the closest-together blobs until exactly `expected` remain. */
function mergeTo(blobs: Band[], expected: number): Band[] {
  const out = blobs.map((b) => [...b] as Band)
  while (out.length > expected) {
    let bestIdx = 0
    let bestGap = Infinity
    for (let i = 0; i < out.length - 1; i++) {
      const gap = out[i + 1][0] - out[i][1]
      if (gap < bestGap) {
        bestGap = gap
        bestIdx = i
      }
    }
    out[bestIdx] = [out[bestIdx][0], out[bestIdx + 1][1]]
    out.splice(bestIdx + 1, 1)
  }
  return out
}

/**
 * Splits one sprite row into exactly `expected` frame column-ranges.
 *
 * Anchored on the caption numbers rather than on the subjects themselves.
 * Subject blobs are unreliable: consecutive dogs in a walk cycle overlap
 * horizontally and merge, while a pill bottle and its detached cap are one
 * frame in two pieces. Splitting merged blobs at their thinnest column picks
 * visibly wrong seams. The captions do not have either problem — there is
 * exactly one per frame and it is centred beneath it — so the boundaries are
 * the midpoints between neighbouring caption centres.
 *
 * Rows with no captions (the car sheet's unnumbered last row) fall back to
 * dividing the row evenly, which is safe because those rows are regular.
 */
function splitRow(
  mask: Mask,
  sprites: Band,
  captions: Band | null,
  expected: number,
): Band[] {
  if (captions) {
    // Multi-digit numbers break into one blob per glyph, so merge back down to
    // one blob per caption. Inter-glyph gaps are far smaller than inter-caption
    // gaps, which is exactly what mergeTo keys on.
    const marks = mergeTo(blobsIn(mask, captions), expected)
    if (marks.length === expected) {
      const centres = marks.map(([a, b]) => (a + b) / 2)
      const row = blobsIn(mask, sprites)
      const left = row.length ? row[0][0] : 0
      const right = row.length ? row[row.length - 1][1] : mask.width - 1

      return centres.map((c, i) => {
        const start = i === 0 ? left : Math.round((centres[i - 1] + c) / 2)
        const end = i === expected - 1 ? right : Math.round((c + centres[i + 1]) / 2) - 1
        return [start, end] as Band
      })
    }
  }

  const row = blobsIn(mask, sprites)
  if (!row.length) throw new Error(`empty sprite row ${sprites[0]}-${sprites[1]}`)
  const left = row[0][0]
  const right = row[row.length - 1][1]
  const step = (right - left + 1) / expected
  return Array.from({ length: expected }, (_, i) => [
    Math.round(left + i * step),
    Math.round(left + (i + 1) * step) - 1,
  ])
}

interface Frame {
  x: number
  y: number
  w: number
  h: number
}

/**
 * Erases fragments of neighbouring frames that bleed across a frame boundary.
 *
 * Subjects in the walk and run rows overlap horizontally and their contact
 * shadows touch, so a boundary drawn between two caption centres can still cut
 * through the next subject and leave a sliver at the frame edge.
 *
 * A fragment is only dropped when it both touches the left or right edge of the
 * box and is small relative to the main subject. That distinction matters: the
 * pill bottle's flying cap is also a detached component, but it sits inside the
 * frame rather than on its edge, so it survives.
 */
function despeckle(mask: Mask, box: Frame) {
  const { width, alpha } = mask
  const { x, y, w, h } = box
  const label = new Int32Array(w * h).fill(-1)
  const areas: number[] = []
  const touchesEdge: boolean[] = []

  for (let i = 0; i < w * h; i++) {
    if (label[i] >= 0) continue
    const sx = i % w
    const sy = (i / w) | 0
    if (alpha[(y + sy) * width + (x + sx)] <= SOLID) continue

    const id = areas.length
    let area = 0
    let edge = false
    const stack = [i]
    label[i] = id
    while (stack.length) {
      const p = stack.pop()!
      const px = p % w
      const py = (p / w) | 0
      area++
      if (px === 0 || px === w - 1) edge = true
      for (const [dx, dy] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ]) {
        const nx = px + dx
        const ny = py + dy
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue
        const np = ny * w + nx
        if (label[np] >= 0) continue
        if (alpha[(y + ny) * width + (x + nx)] <= SOLID) continue
        label[np] = id
        stack.push(np)
      }
    }
    areas.push(area)
    touchesEdge.push(edge)
  }

  if (!areas.length) return
  const largest = Math.max(...areas)
  for (let i = 0; i < w * h; i++) {
    const id = label[i]
    if (id < 0) continue
    if (touchesEdge[id] && areas[id] < largest * 0.2) {
      alpha[(y + ((i / w) | 0)) * width + (x + (i % w))] = 0
    }
  }
}

/** Tightens a frame box to its own content, so cells are not mostly padding. */
function trim(mask: Mask, x0: number, x1: number, y0: number, y1: number): Frame {
  const { width, alpha } = mask
  let minX = x1
  let maxX = x0
  let minY = y1
  let maxY = y0
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      if (alpha[y * width + x] > SOLID) {
        if (x < minX) minX = x
        if (x > maxX) maxX = x
        if (y < minY) minY = y
        if (y > maxY) maxY = y
      }
    }
  }
  return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 }
}

async function processSheet(key: string, cfg: SheetConfig) {
  const srcPath = resolve(root, 'assets/images/sprites', cfg.src)
  const mask = await keyBackground(srcPath)

  const rows = pairRows(findBands(mask))
  if (rows.length !== cfg.rows.length) {
    throw new Error(
      `${key}: detected ${rows.length} sprite rows, config expects ${cfg.rows.length}`,
    )
  }

  // Every frame in the sheet, in reading order.
  const frames: Frame[] = []
  rows.forEach(({ sprites, captions }, i) => {
    for (const [x0, x1] of splitRow(mask, sprites, captions, cfg.rows[i])) {
      // Clean bled-in neighbour fragments before measuring, so the trim reflects
      // this frame's subject rather than a sliver of the one beside it.
      despeckle(mask, { x: x0, y: sprites[0], w: x1 - x0 + 1, h: sprites[1] - sprites[0] + 1 })
      frames.push(trim(mask, x0, x1, sprites[0], sprites[1]))
    }
  })

  // The keyed full sheet, cut from once per state below.
  const keyed = await sharp(mask.rgb, {
    raw: { width: mask.width, height: mask.height, channels: 3 },
  })
    .ensureAlpha()
    .joinChannel(Buffer.from(mask.alpha), {
      raw: { width: mask.width, height: mask.height, channels: 1 },
    })
    .png()
    .toBuffer()

  const manifest: Record<
    string,
    { src: string; frames: number; frameWidth: number; frameHeight: number; columns: number }
  > = {}

  for (const [state, [from, to]] of Object.entries(cfg.states)) {
    const group = frames.slice(from, to + 1)

    // One cell size for the whole state, from its largest frame, so the runtime
    // can step by a constant offset. Constrained on both axes: height alone
    // would leave very wide frames enormous.
    const maxH = Math.max(...group.map((f) => f.h))
    const maxW = Math.max(...group.map((f) => f.w))
    const scale = Math.min(cfg.cellHeight / maxH, (cfg.cellMaxWidth ?? cfg.cellHeight * 2) / maxW)
    const cellH = cfg.cellHeight
    const cellW = Math.ceil(maxW * scale)

    const cells = await Promise.all(
      group.map(async (f) => {
        const w = Math.max(1, Math.round(f.w * scale))
        const h = Math.max(1, Math.round(f.h * scale))
        const resized = await sharp(keyed)
          .extract({ left: f.x, top: f.y, width: f.w, height: f.h })
          .resize(w, h)
          .toBuffer()
        // Horizontally centred always; vertically per the sheet's alignment, so
        // walk cycles keep a stable ground line instead of bobbing.
        const top = cfg.align === 'bottom' ? cellH - h : Math.round((cellH - h) / 2)
        return sharp({
          create: { width: cellW, height: cellH, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
        })
          .composite([{ input: resized, left: Math.round((cellW - w) / 2), top }])
          .png()
          .toBuffer()
      }),
    )

    // WebP cannot exceed 16383px on either axis, and a 30-frame strip of wide
    // cells passes that. Wrap into a grid; the runtime reads `columns` and
    // steps in two dimensions.
    const WEBP_MAX = 16383
    const columns = Math.max(1, Math.min(cells.length, Math.floor(WEBP_MAX / cellW)))
    const rows = Math.ceil(cells.length / columns)

    const file = `${key}-${state}.webp`
    await sharp({
      create: {
        width: cellW * columns,
        height: cellH * rows,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    })
      .composite(
        cells.map((input, i) => ({
          input,
          left: (i % columns) * cellW,
          top: Math.floor(i / columns) * cellH,
        })),
      )
      .webp({ quality: 88, alphaQuality: 90, effort: 6 })
      .toFile(resolve(outDir, file))

    manifest[`${key}-${state}`] = {
      src: file,
      frames: cells.length,
      frameWidth: cellW,
      frameHeight: cellH,
      columns,
    }
    console.log(
      `  ${file.padEnd(24)} ${String(cells.length).padStart(2)} frames @ ${cellW}x${cellH}` +
        (rows > 1 ? ` (${columns}x${rows} grid)` : ''),
    )
  }

  // Verification overlay: the detected frame boxes drawn on the source, so the
  // segmentation can be checked by eye rather than trusted blindly.
  const rects = frames
    .map(
      (f, i) =>
        `<rect x="${f.x}" y="${f.y}" width="${f.w}" height="${f.h}" fill="none" stroke="#ff0080" stroke-width="3"/>` +
        `<text x="${f.x + 4}" y="${f.y + 26}" font-size="24" fill="#ff0080">${i}</text>`,
    )
    .join('')
  await sharp(srcPath)
    .composite([
      {
        input: Buffer.from(
          `<svg width="${mask.width}" height="${mask.height}">${rects}</svg>`,
        ),
      },
    ])
    .png()
    .toFile(resolve(verifyDir, `${key}.png`))

  return manifest
}

async function main() {
  // Wipe generated output first, so renaming or removing a state in SHEETS
  // cannot leave an orphaned strip behind to be shipped forever.
  rmSync(outDir, { recursive: true, force: true })
  mkdirSync(outDir, { recursive: true })
  mkdirSync(verifyDir, { recursive: true })
  for (const f of readdirSync(verifyDir)) rmSync(resolve(verifyDir, f))

  let manifest: Record<string, unknown> = {}
  for (const [key, cfg] of Object.entries(SHEETS)) {
    console.log(`${key}:`)
    manifest = { ...manifest, ...(await processSheet(key, cfg)) }
  }
  writeFileSync(resolve(outDir, 'sprites.json'), JSON.stringify(manifest, null, 2) + '\n')
  console.log(`\nWrote ${Object.keys(manifest).length} strips + sprites.json`)
}

main()

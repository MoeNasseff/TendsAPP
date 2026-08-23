/**
 * Port of TailAdmin's GridShape (components/common/GridShape.tsx).
 *
 * Two copies of the same asset — the second rotated 180° into the opposite
 * corner. Both sit at `-z-1`, so they render behind the panel's content rather
 * than over it; that class only compiles because `--z-index-1` is declared in
 * index.css.
 *
 * The one deviation from TailAdmin: they set `alt="grid"`, which makes a screen
 * reader announce "grid" twice for pure decoration. `alt="" aria-hidden` is the
 * same pixels with none of the noise.
 */
export function GridShape() {
  return (
    <>
      <div className="absolute right-0 top-0 -z-1 w-full max-w-[250px] xl:max-w-[450px]">
        <img src="/images/shape/grid-01.svg" alt="" aria-hidden="true" />
      </div>
      <div className="absolute bottom-0 left-0 -z-1 w-full max-w-[250px] rotate-180 xl:max-w-[450px]">
        <img src="/images/shape/grid-01.svg" alt="" aria-hidden="true" />
      </div>
    </>
  )
}

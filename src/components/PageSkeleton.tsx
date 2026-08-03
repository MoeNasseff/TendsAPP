import { SpriteAnimator } from './sprite/SpriteAnimator'
import { DOG } from '../lib/sprite/animations'

export function PageSkeleton() {
  return (
    <div className="flex flex-col gap-5">
      {/* Running dog above the placeholders. Purely decorative, so it is
          aria-hidden and inert — a screen reader still announces nothing here,
          exactly as before. */}
      <div className="flex justify-center">
        <SpriteAnimator image={DOG.run} scale={0.45} />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="glass h-16 animate-pulse rounded-2xl border" />
        ))}
      </div>
      <div className="glass h-48 animate-pulse rounded-2xl border" />
      <div className="glass h-64 animate-pulse rounded-2xl border" />
    </div>
  )
}

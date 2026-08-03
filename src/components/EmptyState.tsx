import type { LucideIcon } from 'lucide-react'
import { SpriteAnimator } from './sprite/SpriteAnimator'
import { DOG } from '../lib/sprite/animations'

export function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon
  title: string
  description?: string
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-white/10 py-12 text-center">
      {/* Sitting dog replaces nothing — the icon, title and description are
          untouched. It just softens an otherwise blank panel. */}
      <SpriteAnimator image={DOG.sit} scale={0.4} />
      <Icon className="h-8 w-8 text-slate-600" />
      <p className="text-sm font-medium text-slate-300">{title}</p>
      {description && <p className="text-xs text-slate-500">{description}</p>}
    </div>
  )
}

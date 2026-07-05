import type { HTMLAttributes } from 'react'

export function GlassCard({ className = '', ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`glass rounded-2xl border p-5 ${className}`} {...rest} />
}

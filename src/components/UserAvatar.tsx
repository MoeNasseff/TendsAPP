import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { LogOut, User as UserIcon } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useProfile } from '../hooks/useProfile'
import { useToast } from '../hooks/useToast'
import { supabase } from '../lib/supabase'

function initialsFor(displayName: string | null, email: string | undefined) {
  if (displayName?.trim()) {
    const parts = displayName.trim().split(/\s+/)
    return parts.length > 1 ? `${parts[0][0]}${parts[1][0]}`.toUpperCase() : parts[0].slice(0, 2).toUpperCase()
  }
  return email ? email[0].toUpperCase() : '?'
}

/**
 * Two entry points to the same identity, on purpose: the header keeps its
 * small circular button at every width, and the sidebar gets a labelled
 * variant for its bottom user section. One hook, one component, a variant
 * prop — not a second avatar component.
 */
export function UserAvatar({ variant = 'header', collapsed = false }: { variant?: 'header' | 'sidebar'; collapsed?: boolean }) {
  const { user } = useAuth()
  const { profile } = useProfile()
  const showToast = useToast()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onPointerDown(e: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  async function handleSignOut() {
    const { error } = await supabase.auth.signOut()
    if (error) showToast(error.message, 'error')
  }

  if (!user) return null

  const initials = initialsFor(profile.display_name, user.email)
  const name = profile.display_name?.trim() || user.email

  const menuItems = (
    <>
      <Link
        to="/settings"
        role="menuitem"
        onClick={() => setOpen(false)}
        className="flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-slate-800 hover:bg-black/5 dark:text-slate-200 dark:hover:bg-white/5"
      >
        <UserIcon className="h-4 w-4 text-slate-500 dark:text-slate-400" />
        Profile
      </Link>
      <button
        type="button"
        role="menuitem"
        onClick={() => {
          setOpen(false)
          handleSignOut()
        }}
        className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm text-slate-800 hover:bg-red-500/10 hover:text-red-600 dark:text-slate-200 dark:hover:text-red-400"
      >
        <LogOut className="h-4 w-4 text-slate-500 dark:text-slate-400" />
        Log out
      </button>
    </>
  )

  if (variant === 'sidebar') {
    return (
      <div ref={rootRef} className="relative">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          title={collapsed ? name : undefined}
          className={`tap-target flex w-full items-center gap-3 rounded-lg py-2 transition-colors duration-fast ease-out-expo hover:bg-white/5 ${
            collapsed ? 'justify-center px-2' : 'px-3'
          }`}
          aria-label="Account menu"
          aria-haspopup="menu"
          aria-expanded={open}
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full border border-black/10 bg-surface-low text-xs font-semibold text-slate-800 dark:border-white/10 dark:text-slate-200">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
            ) : (
              initials
            )}
          </span>
          {!collapsed && <span className="min-w-0 flex-1 truncate text-left text-sm font-medium text-white/80">{name}</span>}
        </button>

        {open && (
          <div
            role="menu"
            className="absolute bottom-[calc(100%+0.5rem)] left-0 z-50 w-44 overflow-hidden rounded-xl border border-black/10 bg-surface-low py-1 shadow-xl shadow-black/10 dark:border-white/10 dark:shadow-black/40"
          >
            {menuItems}
          </div>
        )}
      </div>
    )
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="tap-target flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border border-black/10 bg-surface-low text-xs font-semibold text-slate-800 transition-colors duration-fast ease-out-expo hover:border-black/20 dark:border-white/10 dark:text-slate-200 dark:hover:border-white/20"
        aria-label="Account menu"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {profile.avatar_url ? (
          <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
        ) : (
          initials
        )}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+0.5rem)] z-50 w-44 overflow-hidden rounded-xl border border-black/10 bg-surface-low py-1 shadow-xl shadow-black/10 dark:border-white/10 dark:shadow-black/40"
        >
          {menuItems}
        </div>
      )}
    </div>
  )
}

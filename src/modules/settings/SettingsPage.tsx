import { useEffect, useRef, useState } from 'react'
import { Camera, Check, Laptop, Moon, Sun } from 'lucide-react'
import { PageHeader } from '../../components/PageHeader'
import { Card } from '../../components/Card'
import { useAuth } from '../../hooks/useAuth'
import { useProfile } from '../../hooks/useProfile'
import { useTheme } from '../../hooks/useTheme'
import type { ThemeMode } from '../../lib/theme'
import { useToast } from '../../hooks/useToast'
import { supabase } from '../../lib/supabase'

const THEME_OPTIONS: { value: ThemeMode; label: string; icon: typeof Sun }[] = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Laptop },
]

export function SettingsPage() {
  const { user } = useAuth()
  const { profile, loading, updateProfile } = useProfile()
  const { mode, setTheme } = useTheme()
  const showToast = useToast()

  const [displayName, setDisplayName] = useState('')
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!loading) setDisplayName(profile.display_name ?? '')
  }, [loading, profile.display_name])

  async function handleNameBlur() {
    const trimmed = displayName.trim()
    if (trimmed === (profile.display_name ?? '')) return
    const { error } = await updateProfile({ display_name: trimmed || null })
    if (error) showToast(error.message, 'error')
  }

  async function handleAvatarSelected(file: File | undefined) {
    if (!file || !user) return
    setUploadingAvatar(true)
    const path = `${user.id}/avatars/${crypto.randomUUID()}-${file.name}`
    const { error: uploadError } = await supabase.storage.from('media').upload(path, file)
    if (uploadError) {
      setUploadingAvatar(false)
      showToast(uploadError.message, 'error')
      return
    }
    const { data } = supabase.storage.from('media').getPublicUrl(path)
    const { error } = await updateProfile({ avatar_url: data.publicUrl })
    setUploadingAvatar(false)
    if (error) showToast(error.message, 'error')
  }

  async function handleSignOut() {
    const { error } = await supabase.auth.signOut()
    if (error) showToast(error.message, 'error')
  }

  return (
    <div className="flex flex-col gap-8">
      <PageHeader eyebrow="Account" title="Settings" />

      <Card className="flex flex-col gap-5">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Profile</h2>

        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingAvatar}
            aria-label="Change avatar photo"
            className="tap-target relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border border-black/10 bg-surface-low text-lg font-semibold text-slate-800 dark:border-white/10 dark:text-slate-200"
          >
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
            ) : (
              (profile.display_name?.trim()?.[0] ?? user?.email?.[0] ?? '?').toUpperCase()
            )}
            <span className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity hover:opacity-100">
              <Camera className="h-5 w-5 text-white" />
            </span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleAvatarSelected(e.target.files?.[0])}
          />
          <div className="flex flex-col gap-1">
            <p className="text-sm font-medium text-slate-900 dark:text-white">
              {uploadingAvatar ? 'Uploading…' : 'Profile photo'}
            </p>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingAvatar}
              className="text-left text-xs text-brand-primary hover:opacity-80"
            >
              Change photo
            </button>
          </div>
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="text-micro uppercase text-slate-500 dark:text-white/50">Display name</span>
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            onBlur={handleNameBlur}
            placeholder="Add your name"
            className="form-input rounded-lg border border-black/10 bg-black/[0.02] px-3 py-2 text-sm text-slate-900 outline-none dark:border-white/10 dark:bg-black/20 dark:text-slate-200"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-micro uppercase text-slate-500 dark:text-white/50">Email</span>
          <p className="rounded-lg border border-black/10 bg-black/[0.02] px-3 py-2 text-sm text-slate-500 dark:border-white/10 dark:bg-black/20 dark:text-slate-400">
            {user?.email}
          </p>
        </label>
      </Card>

      <Card className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Appearance</h2>
        <div className="flex gap-2">
          {THEME_OPTIONS.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              onClick={() => setTheme(value)}
              aria-pressed={mode === value}
              className={`tap-target flex flex-1 flex-col items-center gap-1.5 rounded-xl border px-3 py-3 text-xs font-medium transition-colors ${
                mode === value
                  ? 'border-brand-primary bg-brand-primary/10 text-brand-primary'
                  : 'border-black/10 text-slate-500 hover:border-black/20 dark:border-white/10 dark:text-white/50 dark:hover:border-white/20'
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
              {mode === value && <Check className="h-3 w-3" />}
            </button>
          ))}
        </div>
      </Card>

      <Card>
        <button
          type="button"
          onClick={handleSignOut}
          className="text-sm font-medium text-red-600 hover:opacity-80 dark:text-red-400"
        >
          Sign out
        </button>
      </Card>
    </div>
  )
}

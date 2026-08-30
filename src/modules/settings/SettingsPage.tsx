import { newId } from '../../lib/id'
import { useEffect, useRef, useState } from 'react'
import { Camera, Check, Laptop, Moon, Sun } from 'lucide-react'
import { PageHeader } from '../../components/PageHeader'
import { Card } from '../../components/Card'
import { useAuth } from '../../hooks/useAuth'
import { useAIProviders } from '../../hooks/useAIProviders'
import { useProfile } from '../../hooks/useProfile'
import { useTheme } from '../../hooks/useTheme'
import type { ThemeMode } from '../../lib/theme'
import { useToast } from '../../hooks/useToast'
import { supabase } from '../../lib/supabase'
import { IngestTokensSettings } from './IngestTokensSettings'

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
    const path = `${user.id}/avatars/${newId()}-${file.name}`
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
            className="form-input rounded-lg border border-black/10 bg-black/[0.02] px-3 py-2 text-sm text-slate-900 outline-hidden dark:border-white/10 dark:bg-black/20 dark:text-slate-200"
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

      <AIProviderSettings />

      <SmsAiSettings />

      <IngestTokensSettings />

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

/**
 * Session 8 / Packet 5c — AI provider settings.
 *
 * Deliberately has no reveal control. `api_key` is not in the authenticated
 * role's column grants, so the browser genuinely cannot read a key back — an
 * eye toggle would have nothing to show. "Test connection" proves a key works
 * instead, which is what the reveal would have been used for.
 *
 * The key is held in local state only while it is being typed, and cleared the
 * moment it is saved, so it never survives in component state or a re-render.
 */
function AIProviderSettings() {
  const { providers, states, loading, testing, saveKey, setEnabled, removeKey, testConnection } =
    useAIProviders()
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [notes, setNotes] = useState<Record<string, string>>({})

  if (loading) return null

  const active = states.find((s) => s.hasKey && s.enabled)

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-white">AI scanning</h2>
        <p className="text-xs text-slate-500 dark:text-white/50">
          {active
            ? `Using your own ${providers.find((p) => p.id === active.provider)?.label} key.`
            : 'Using the shared managed key. Test the connection to confirm it is available — the app cannot see that from here.'}
        </p>
      </div>

      {providers.map((provider) => {
        const state = states.find((s) => s.provider === provider.id)
        const draft = drafts[provider.id] ?? ''
        const note = notes[provider.id]

        return (
          <div key={provider.id} className="flex flex-col gap-3">
            <label className="flex flex-col gap-1.5">
              <span className="text-micro uppercase text-slate-500 dark:text-white/50">
                {provider.label} API key
              </span>
              <input
                type="password"
                autoComplete="off"
                value={draft}
                onChange={(e) => setDrafts((d) => ({ ...d, [provider.id]: e.target.value }))}
                placeholder={state?.hasKey ? '•••••••••••••••• saved' : 'Paste your key'}
                className="form-input rounded-lg border border-black/10 bg-black/[0.02] px-3 py-2 text-sm text-slate-900 outline-hidden dark:border-white/10 dark:bg-black/20 dark:text-slate-200"
              />
            </label>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={!draft.trim()}
                onClick={async () => {
                  const { error } = await saveKey(provider.id, draft.trim())
                  // Cleared either way: a failed save must not leave the key
                  // sitting in state waiting to be re-rendered.
                  setDrafts((d) => ({ ...d, [provider.id]: '' }))
                  setNotes((n) => ({
                    ...n,
                    [provider.id]: error ? 'Could not save the key.' : 'Key saved.',
                  }))
                }}
                className="tap-target rounded-lg bg-brand-500 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-brand-600 disabled:opacity-40"
              >
                Save key
              </button>

              <button
                type="button"
                disabled={testing === provider.id}
                onClick={async () => {
                  const result = await testConnection(provider.id)
                  setNotes((n) => ({
                    ...n,
                    [provider.id]: result.ok ? 'Connection works.' : result.reason,
                  }))
                }}
                className="tap-target rounded-lg border border-black/10 px-3 py-2 text-xs font-medium text-slate-600 transition-colors hover:border-black/20 disabled:opacity-40 dark:border-white/10 dark:text-white/70 dark:hover:border-white/20"
              >
                {testing === provider.id ? 'Testing…' : 'Test connection'}
              </button>

              {state?.hasKey && (
                <>
                  <button
                    type="button"
                    onClick={() => setEnabled(provider.id, !state.enabled)}
                    aria-pressed={state.enabled}
                    className="tap-target rounded-lg border border-black/10 px-3 py-2 text-xs font-medium text-slate-600 transition-colors hover:border-black/20 dark:border-white/10 dark:text-white/70 dark:hover:border-white/20"
                  >
                    {state.enabled ? 'Disable' : 'Enable'}
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      await removeKey(provider.id)
                      setNotes((n) => ({ ...n, [provider.id]: 'Key removed.' }))
                    }}
                    className="tap-target rounded-lg px-3 py-2 text-xs font-medium text-red-600 hover:opacity-80 dark:text-red-400"
                  >
                    Remove
                  </button>
                </>
              )}
            </div>

            {note && <p className="text-xs text-slate-500 dark:text-white/50">{note}</p>}
          </div>
        )
      })}

      {/* Sits directly under the per-provider result line, so it has to read
          as background rather than as a second status — "no provider
          available" beneath a green "Connection works" looked like a
          contradiction. */}
      <p className="text-xs text-slate-500 dark:text-white/50">
        Adding your own key is optional. Expenses can always be entered manually, with or without
        a provider.
      </p>
    </Card>
  )
}

/**
 * Consent toggle for the SMS-inbox AI fallback (Session 27). Off by default;
 * this is the only place that turns it on. Deliberately its own card, not
 * folded into AIProviderSettings above — having a working Gemini key for
 * receipt scanning does not imply consent to send bank-text content
 * anywhere, and the two need separate, explicit agreement.
 */
function SmsAiSettings() {
  const { profile, loading, updateProfile } = useProfile()
  const showToast = useToast()

  if (loading) return null

  async function handleToggle() {
    const { error } = await updateProfile({ sms_ai_parsing_enabled: !profile.sms_ai_parsing_enabled })
    if (error) showToast(error.message, 'error')
  }

  return (
    <Card className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Bank text parsing</h2>
      <p className="text-xs text-slate-500 dark:text-white/50">
        When a bank or payment text can&rsquo;t be read by Tend&rsquo;s own built-in parsers, this
        sends just that message&rsquo;s text to your configured AI provider to extract the amount
        and merchant. Off by default. Either way, the result still needs your review on Inbox
        before it becomes an expense — nothing is created automatically.
      </p>
      <label className="flex items-center gap-3 text-sm text-slate-700 dark:text-white/80">
        <input
          type="checkbox"
          checked={profile.sms_ai_parsing_enabled}
          onChange={handleToggle}
          className="h-4 w-4 rounded border-black/10 dark:border-white/10"
        />
        Allow AI parsing for bank texts that can&rsquo;t be read deterministically
      </label>
    </Card>
  )
}

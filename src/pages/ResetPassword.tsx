import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AuthLayout } from '../components/AuthLayout'
import { supabase } from '../lib/supabase'
import { useToast } from '../hooks/useToast'
import { MIN_PASSWORD_LENGTH, usePasswordChange } from '../modules/profile/usePasswordChange'

/**
 * Where the "Forgot password?" email actually lands.
 *
 * Before this page, `Login.tsx` sent a real reset email whose `redirectTo` was
 * `/`, and nothing anywhere handled the arrival: `AuthProvider` discarded the
 * auth event as `_event`, so the `PASSWORD_RECOVERY` Supabase fires was never
 * seen. The user clicked the link, landed on the dashboard signed in, and had
 * no way to set a new password. The button worked; the flow did not exist.
 *
 * Standalone page, not a module page: whoever arrives here is mid-recovery and
 * must not be sent through `RequireAuth` → `SeedGate` → `AppShell` first.
 *
 * No current-password field, and that is correct rather than an oversight —
 * the emailed link *is* the proof of identity, and someone recovering an
 * account by definition cannot supply the old password. The signed-in path in
 * Settings does ask for it; see `usePasswordChange`, where the two are
 * separate functions so the re-auth step cannot be skipped by accident.
 */
export function ResetPassword() {
  const navigate = useNavigate()
  const showToast = useToast()
  const { setPasswordAfterRecovery, saving } = usePasswordChange()

  const [ready, setReady] = useState<'checking' | 'ok' | 'no-session'>('checking')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)

  /**
   * The recovery link puts a real session in place before this renders (the
   * Supabase client parses the URL fragment on load). If there is no session,
   * the link was already used, has expired, or the page was opened directly —
   * all of which need the same "start again" message rather than a form that
   * cannot possibly work.
   */
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setReady(data.session ? 'ok' : 'no-session')
    })
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const result = await setPasswordAfterRecovery(next, confirm)
    if (!result.ok) {
      setError(result.error)
      return
    }
    showToast('Password set. You are signed in.', 'success')
    navigate('/', { replace: true })
  }

  const inputCls =
    'w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-800 outline-none focus:border-brand-500 dark:border-white/10 dark:bg-white/5 dark:text-white/90'

  return (
    <AuthLayout>
      <div className="flex flex-1 flex-col justify-center">
        <div className="mx-auto w-full max-w-md">
          <h1 className="mb-2 text-title-sm font-semibold text-gray-800 dark:text-white/90">Set a new password</h1>

          {ready === 'checking' && <p className="text-sm text-gray-500 dark:text-gray-400">Checking your link…</p>}

          {ready === 'no-session' && (
            <>
              <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
                This reset link has expired or has already been used. Request a new one and it will arrive by email.
              </p>
              <Link
                to="/login"
                className="inline-flex rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600"
              >
                Back to sign in
              </Link>
            </>
          )}

          {ready === 'ok' && (
            <>
              <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
                Choose a new password for your account. You are signed in as soon as it is saved.
              </p>
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">New password</span>
                  <input
                    type="password"
                    autoComplete="new-password"
                    className={inputCls}
                    value={next}
                    onChange={(e) => setNext(e.target.value)}
                    autoFocus
                  />
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    At least {MIN_PASSWORD_LENGTH} characters.
                  </span>
                </label>

                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Confirm password</span>
                  <input
                    type="password"
                    autoComplete="new-password"
                    className={inputCls}
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                  />
                </label>

                {error && <p className="text-xs text-error-500">{error}</p>}

                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-60"
                >
                  {saving ? 'Saving…' : 'Save new password'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </AuthLayout>
  )
}

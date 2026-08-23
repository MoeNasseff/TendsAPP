import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../hooks/useToast'
import { AuthLayout } from '../components/AuthLayout'
import { AuthOrDivider, AuthSocialButtons } from '../components/AuthSocialButtons'
import { authField, authLabel } from '../components/auth-fields'

type Mode = 'password' | 'magic-link'

/**
 * Port of TailAdmin's SignInForm (components/auth/SignInForm.tsx), inside their
 * AuthPageLayout. The shell and the brand panel now live in <AuthLayout>, which
 * /signup consumes too — this file is only the form column, exactly as
 * SignInForm is on their side.
 *
 * Auth logic is unchanged: password sign-in, magic link, OAuth and password
 * reset, all against Supabase. Account creation has moved to /signup.
 */
export function Login() {
  const { session } = useAuth()
  const navigate = useNavigate()
  const showToast = useToast()

  const [mode, setMode] = useState<Mode>('password')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [magicLinkSent, setMagicLinkSent] = useState(false)

  useEffect(() => {
    if (session) navigate('/', { replace: true })
  }, [session, navigate])

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim() || !password.trim()) {
      showToast('Please fill all required fields', 'error')
      return
    }

    setSubmitting(true)
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })
    setSubmitting(false)

    if (error) {
      showToast(error.message, 'error')
      return
    }
    showToast('Signed in successfully!', 'success')
  }

  async function handleMagicLinkSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) {
      showToast('Please enter your email', 'error')
      return
    }

    setSubmitting(true)
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/` },
    })
    setSubmitting(false)

    if (error) {
      showToast(error.message, 'error')
      return
    }

    setMagicLinkSent(true)
    showToast('Magic link sent — check your email.', 'success')
  }

  async function handleForgotPassword() {
    if (!email.trim()) {
      showToast('Enter your email first, then tap Forgot password.', 'error')
      return
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/`,
    })
    showToast(
      error ? error.message : 'Password reset link sent — check your email.',
      error ? 'error' : 'success',
    )
  }

  return (
    <AuthLayout>
      <div className="flex flex-1 flex-col">
        {/* Back link parked 2026-08-19 — uncomment to restore, and re-add
            ChevronLeft to the lucide import. TailAdmin has one here reading
            "Back to dashboard"; ours said "Back to home" because `/` is the
            landing page for a signed-out visitor, not a dashboard. Note its
            `pt-10` also served as this column's top spacer, so with the block
            gone the form sits slightly higher than TailAdmin's. */}
        {/*
        <div className="mx-auto w-full max-w-md pt-10">
          <Link
            to="/"
            className="inline-flex items-center text-sm text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          >
            <ChevronLeft className="size-5" />
            Back to home
          </Link>
        </div>
        */}

        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center">
          <div>
            <div className="mb-5 sm:mb-8">
              <h1 className="mb-2 text-title-sm font-semibold text-gray-800 dark:text-white/90 sm:text-title-md">
                Sign In
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Enter your email and password to sign in!
              </p>
            </div>

            <div>
              <AuthSocialButtons verb="Sign in" />
              <AuthOrDivider />

              {mode === 'password' ? (
                <form onSubmit={handlePasswordSubmit}>
                  <div className="space-y-6">
                    <div>
                      <label className={authLabel} htmlFor="login-email">
                        Email <span className="text-error-500">*</span>
                      </label>
                      <input
                        id="login-email"
                        type="email"
                        required
                        placeholder="info@gmail.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className={authField}
                      />
                    </div>
                    <div>
                      <label className={authLabel} htmlFor="login-password">
                        Password <span className="text-error-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          id="login-password"
                          type={showPassword ? 'text' : 'password'}
                          required
                          placeholder="Enter your password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className={authField}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((v) => !v)}
                          aria-label={showPassword ? 'Hide password' : 'Show password'}
                          className="absolute right-4 top-1/2 z-30 -translate-y-1/2 cursor-pointer text-gray-500 dark:text-gray-400"
                        >
                          {showPassword ? <Eye className="size-5" /> : <EyeOff className="size-5" />}
                        </button>
                      </div>
                    </div>
                    {/* Their layout has "Keep me logged in" on the left of this
                        row; Supabase persists sessions on its own, so that would
                        be decorative. The magic-link switch takes the space
                        instead — it is a real second sign-in method and needs a
                        home now that the grid above holds the OAuth providers. */}
                    <div className="flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => setMode('magic-link')}
                        className="text-theme-sm font-normal text-gray-700 hover:text-brand-500 dark:text-gray-400 dark:hover:text-brand-400"
                      >
                        Email me a magic link
                      </button>
                      <button
                        type="button"
                        onClick={handleForgotPassword}
                        className="text-sm text-brand-500 hover:text-brand-600 dark:text-brand-400"
                      >
                        Forgot password?
                      </button>
                    </div>
                    <div>
                      <button
                        type="submit"
                        disabled={submitting}
                        className="flex w-full items-center justify-center rounded-lg bg-brand-500 px-4 py-3 text-sm font-medium text-white shadow-theme-xs transition-colors hover:bg-brand-600 disabled:bg-brand-300"
                      >
                        {submitting ? 'Please wait…' : 'Sign in'}
                      </button>
                    </div>
                  </div>
                </form>
              ) : magicLinkSent ? (
                <p className="py-4 text-center text-sm text-gray-700 dark:text-gray-400">
                  Check <span className="text-brand-500 dark:text-brand-400">{email}</span> for your
                  sign-in link.
                </p>
              ) : (
                <form onSubmit={handleMagicLinkSubmit}>
                  <div className="space-y-6">
                    <div>
                      <label className={authLabel} htmlFor="login-magic-email">
                        Email <span className="text-error-500">*</span>
                      </label>
                      <input
                        id="login-magic-email"
                        type="email"
                        required
                        placeholder="info@gmail.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className={authField}
                      />
                    </div>
                    <div className="flex items-center justify-start">
                      <button
                        type="button"
                        onClick={() => setMode('password')}
                        className="text-theme-sm font-normal text-gray-700 hover:text-brand-500 dark:text-gray-400 dark:hover:text-brand-400"
                      >
                        Use a password instead
                      </button>
                    </div>
                    <div>
                      <button
                        type="submit"
                        disabled={submitting}
                        className="flex w-full items-center justify-center rounded-lg bg-brand-500 px-4 py-3 text-sm font-medium text-white shadow-theme-xs transition-colors hover:bg-brand-600 disabled:bg-brand-300"
                      >
                        {submitting ? 'Sending…' : 'Send magic link'}
                      </button>
                    </div>
                  </div>
                </form>
              )}

              <div className="mt-5">
                <p className="text-center text-sm font-normal text-gray-700 dark:text-gray-400 sm:text-start">
                  Don&apos;t have an account?{' '}
                  <Link
                    to="/signup"
                    className="text-brand-500 hover:text-brand-600 dark:text-brand-400"
                  >
                    Sign Up
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AuthLayout>
  )
}

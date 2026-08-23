import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../hooks/useToast'
import { AuthLayout } from '../components/AuthLayout'
import { AuthOrDivider, AuthSocialButtons } from '../components/AuthSocialButtons'
import { authCheckbox, authField, authLabel } from '../components/auth-fields'

/**
 * Port of TailAdmin's SignUpForm (components/auth/SignUpForm.tsx), inside the
 * same <AuthLayout> /login uses — so the brand panel on the right is the same
 * DOM on both screens, not a second copy of it.
 *
 * Their form is inert markup. This one is wired to Supabase: the names are sent
 * as user metadata on signUp, and the handle_new_user trigger copies
 * display_name onto the profiles row (see the signup_display_name migration).
 * Writing profiles from here instead would fail whenever email confirmation is
 * on, because there is no session yet and RLS checks `id = auth.uid()`.
 */
export function Signup() {
  const { session } = useAuth()
  const navigate = useNavigate()
  const showToast = useToast()

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isChecked, setIsChecked] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [confirmSent, setConfirmSent] = useState(false)

  useEffect(() => {
    if (session) navigate('/', { replace: true })
  }, [session, navigate])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!firstName.trim() || !lastName.trim() || !email.trim() || !password.trim()) {
      showToast('Please fill all required fields', 'error')
      return
    }
    if (!isChecked) {
      showToast('Please accept the Terms and Privacy Policy to continue.', 'error')
      return
    }

    setSubmitting(true)
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        // Without this, Supabase builds the confirmation link from the
        // project's Site URL, which sends every device to localhost. Using the
        // live origin keeps the link on whichever host signed up.
        emailRedirectTo: `${window.location.origin}/`,
        data: {
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          display_name: `${firstName.trim()} ${lastName.trim()}`.trim(),
        },
      },
    })
    setSubmitting(false)

    if (error) {
      showToast(error.message, 'error')
      return
    }

    // With email confirmation on, signUp returns a user but no session — the
    // account is not usable until the link is clicked. With it off, a session
    // comes back and the effect above redirects into the app.
    if (data.session) {
      showToast('Account created — welcome!', 'success')
      return
    }
    setConfirmSent(true)
    showToast('Account created — check your email to confirm.', 'success')
  }

  return (
    <AuthLayout>
      <div className="no-scrollbar flex w-full flex-1 flex-col overflow-y-auto lg:w-1/2">
        {/* Back link parked 2026-08-19 — see the matching note in Login.tsx.
            Uncomment to restore, and re-add ChevronLeft to the lucide import. */}
        {/*
        <div className="mx-auto mb-5 w-full max-w-md sm:pt-10">
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
                Sign Up
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Enter your email and password to sign up!
              </p>
            </div>

            <div>
              <AuthSocialButtons verb="Sign up" />
              <AuthOrDivider />

              {confirmSent ? (
                <p className="py-4 text-center text-sm text-gray-700 dark:text-gray-400">
                  Check <span className="text-brand-500 dark:text-brand-400">{email}</span> for your
                  confirmation link.
                </p>
              ) : (
                <form onSubmit={handleSubmit}>
                  <div className="space-y-5">
                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                      {/* First Name */}
                      <div className="sm:col-span-1">
                        <label className={authLabel} htmlFor="signup-fname">
                          First Name<span className="text-error-500">*</span>
                        </label>
                        <input
                          id="signup-fname"
                          name="fname"
                          type="text"
                          required
                          autoComplete="given-name"
                          placeholder="Enter your first name"
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          className={authField}
                        />
                      </div>
                      {/* Last Name */}
                      <div className="sm:col-span-1">
                        <label className={authLabel} htmlFor="signup-lname">
                          Last Name<span className="text-error-500">*</span>
                        </label>
                        <input
                          id="signup-lname"
                          name="lname"
                          type="text"
                          required
                          autoComplete="family-name"
                          placeholder="Enter your last name"
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          className={authField}
                        />
                      </div>
                    </div>
                    {/* Email */}
                    <div>
                      <label className={authLabel} htmlFor="signup-email">
                        Email<span className="text-error-500">*</span>
                      </label>
                      <input
                        id="signup-email"
                        name="email"
                        type="email"
                        required
                        autoComplete="email"
                        placeholder="Enter your email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className={authField}
                      />
                    </div>
                    {/* Password */}
                    <div>
                      <label className={authLabel} htmlFor="signup-password">
                        Password<span className="text-error-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          id="signup-password"
                          type={showPassword ? 'text' : 'password'}
                          required
                          autoComplete="new-password"
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
                    {/* Terms */}
                    <div className="flex items-center gap-3">
                      <div className="relative h-5 w-5">
                        <input
                          id="signup-terms"
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => setIsChecked(e.target.checked)}
                          className={authCheckbox}
                        />
                        {isChecked && (
                          <svg
                            className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
                            xmlns="http://www.w3.org/2000/svg"
                            width="14"
                            height="14"
                            viewBox="0 0 14 14"
                            fill="none"
                          >
                            <path
                              d="M11.6666 3.5L5.24992 9.91667L2.33325 7"
                              stroke="white"
                              strokeWidth="1.94437"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        )}
                      </div>
                      <label
                        htmlFor="signup-terms"
                        className="inline-block cursor-pointer font-normal text-gray-500 dark:text-gray-400"
                      >
                        By creating an account means you agree to the{' '}
                        <span className="text-gray-800 dark:text-white/90">
                          Terms and Conditions,
                        </span>{' '}
                        and our <span className="text-gray-800 dark:text-white">Privacy Policy</span>
                      </label>
                    </div>
                    {/* Submit */}
                    <div>
                      <button
                        type="submit"
                        disabled={submitting}
                        className="flex w-full items-center justify-center rounded-lg bg-brand-500 px-4 py-3 text-sm font-medium text-white shadow-theme-xs transition-colors hover:bg-brand-600 disabled:bg-brand-300"
                      >
                        {submitting ? 'Please wait…' : 'Sign Up'}
                      </button>
                    </div>
                  </div>
                </form>
              )}

              <div className="mt-5">
                <p className="text-center text-sm font-normal text-gray-700 dark:text-gray-400 sm:text-start">
                  Already have an account?{' '}
                  <Link
                    to="/login"
                    className="text-brand-500 hover:text-brand-600 dark:text-brand-400"
                  >
                    Sign In
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

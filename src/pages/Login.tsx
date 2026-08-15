import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../hooks/useToast'
import { useBrand } from '../hooks/useBrand'
import { Card } from '../components/Card'

type Mode = 'password' | 'magic-link'

export function Login() {
  const { session } = useAuth()
  const navigate = useNavigate()
  const showToast = useToast()
  const brand = useBrand()

  const [mode, setMode] = useState<Mode>('password')
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
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
    const { error } = isSignUp
      ? await supabase.auth.signUp({
          email: email.trim(),
          password,
          // Without this, Supabase builds the confirmation link from the
          // project's Site URL, which sends every device to localhost. Using
          // the live origin keeps the link on whichever host signed up.
          options: { emailRedirectTo: `${window.location.origin}/` },
        })
      : await supabase.auth.signInWithPassword({ email: email.trim(), password })
    setSubmitting(false)

    if (error) {
      showToast(error.message, 'error')
      return
    }

    if (isSignUp) {
      showToast('Account created — check your email to confirm.', 'success')
    } else {
      showToast('Signed in successfully!', 'success')
    }
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

  return (
    <main className="flex min-h-svh items-center justify-center bg-brand-secondary px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <img src={brand.logo.src} alt={brand.logo.alt} className="h-10 w-auto" />
          <h1 className="font-display text-display-sm text-white">{brand.appName}</h1>
          <p className="text-sm text-white/50">{brand.tagline}</p>
        </div>

        <Card>
          <div className="mb-4 flex rounded-xl border border-white/5 bg-black/20 p-1 text-sm">
            <button
              type="button"
              onClick={() => setMode('password')}
              className={`flex-1 rounded-lg py-1.5 font-medium transition-colors ${
                mode === 'password' ? 'bg-brand-primary text-brand-on-primary' : 'text-slate-400'
              }`}
            >
              Password
            </button>
            <button
              type="button"
              onClick={() => setMode('magic-link')}
              className={`flex-1 rounded-lg py-1.5 font-medium transition-colors ${
                mode === 'magic-link' ? 'bg-brand-primary text-brand-on-primary' : 'text-slate-400'
              }`}
            >
              Magic Link
            </button>
          </div>

          {mode === 'password' ? (
            <form onSubmit={handlePasswordSubmit} className="flex flex-col gap-4">
              <label htmlFor="login-email" className="flex flex-col gap-1">
                <span className="text-micro uppercase text-white/50">Email</span>
                <input
                  id="login-email"
                  type="email"
                  required
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="form-input rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-slate-200 outline-none"
                />
              </label>
              <label htmlFor="login-password" className="flex flex-col gap-1">
                <span className="text-micro uppercase text-white/50">Password</span>
                <input
                  id="login-password"
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="form-input rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-slate-200 outline-none"
                />
              </label>
              <button
                type="submit"
                disabled={submitting}
                className="mt-1 rounded-lg bg-brand-primary py-2 text-sm font-semibold text-brand-on-primary transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {submitting ? 'Please wait…' : isSignUp ? 'Create account' : 'Sign in'}
              </button>
              <button
                type="button"
                onClick={() => setIsSignUp((v) => !v)}
                className="text-xs text-slate-400 hover:text-brand-primary"
              >
                {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
              </button>
            </form>
          ) : magicLinkSent ? (
            <p className="py-4 text-center text-sm text-slate-300">
              Check <span className="text-brand-primary">{email}</span> for your sign-in link.
            </p>
          ) : (
            <form onSubmit={handleMagicLinkSubmit} className="flex flex-col gap-4">
              <label htmlFor="login-magic-email" className="flex flex-col gap-1">
                <span className="text-micro uppercase text-white/50">Email</span>
                <input
                  id="login-magic-email"
                  type="email"
                  required
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="form-input rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-slate-200 outline-none"
                />
              </label>
              <button
                type="submit"
                disabled={submitting}
                className="mt-1 rounded-lg bg-brand-primary py-2 text-sm font-semibold text-brand-on-primary transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {submitting ? 'Sending…' : 'Send magic link'}
              </button>
            </form>
          )}
        </Card>
      </div>
    </main>
  )
}

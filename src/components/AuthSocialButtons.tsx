import { supabase } from '../lib/supabase'
import { useToast } from '../hooks/useToast'

/**
 * The two-up provider grid TailAdmin puts above the "Or" divider on both
 * SignInForm and SignUpForm. They duplicate the markup across the two files and
 * only vary the verb; this takes the verb as a prop so there is one copy.
 *
 * Their second provider is X. Ours is Apple, kept from the existing Login —
 * switching would mean enabling the Twitter provider on the Supabase project,
 * which is a product decision, not a layout one. The button's shape, spacing
 * and treatment are TailAdmin's either way.
 */
export function AuthSocialButtons({ verb }: { verb: 'Sign in' | 'Sign up' }) {
  const showToast = useToast()

  async function handleOAuth(provider: 'google' | 'apple') {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/` },
    })
    // Only reached when the redirect never happens — i.e. the provider is not
    // enabled on the Supabase project. Surfacing the real message is more
    // useful than a generic failure.
    if (error) showToast(error.message, 'error')
  }

  const button =
    'inline-flex items-center justify-center gap-3 rounded-lg bg-gray-100 px-7 py-3 text-sm font-normal' +
    ' text-gray-700 transition-colors hover:bg-gray-200 hover:text-gray-800 dark:bg-white/5' +
    ' dark:text-white/90 dark:hover:bg-white/10'

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-5">
      <button type="button" onClick={() => handleOAuth('google')} className={button}>
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M18.7511 10.1944C18.7511 9.47495 18.6915 8.94995 18.5626 8.40552H10.1797V11.6527H15.1003C15.0011 12.4597 14.4654 13.675 13.2749 14.4916L13.2582 14.6003L15.9087 16.6126L16.0924 16.6305C17.7788 15.1041 18.7511 12.8583 18.7511 10.1944Z"
            fill="#4285F4"
          />
          <path
            d="M10.1788 18.75C12.5895 18.75 14.6133 17.9722 16.0915 16.6305L13.274 14.4916C12.5201 15.0068 11.5081 15.3666 10.1788 15.3666C7.81773 15.3666 5.81379 13.8402 5.09944 11.7305L4.99473 11.7392L2.23868 13.8295L2.20264 13.9277C3.67087 16.786 6.68674 18.75 10.1788 18.75Z"
            fill="#34A853"
          />
          <path
            d="M5.10014 11.7305C4.91165 11.186 4.80257 10.6027 4.80257 9.99992C4.80257 9.3971 4.91165 8.81379 5.09022 8.26935L5.08523 8.1534L2.29464 6.02954L2.20333 6.0721C1.5982 7.25823 1.25098 8.5902 1.25098 9.99992C1.25098 11.4096 1.5982 12.7415 2.20333 13.9277L5.10014 11.7305Z"
            fill="#FBBC05"
          />
          <path
            d="M10.1789 4.63331C11.8554 4.63331 12.9864 5.34303 13.6312 5.93612L16.1511 3.525C14.6035 2.11528 12.5895 1.25 10.1789 1.25C6.68676 1.25 3.67088 3.21387 2.20264 6.07218L5.08953 8.26943C5.81381 6.15972 7.81776 4.63331 10.1789 4.63331Z"
            fill="#EB4335"
          />
        </svg>
        {verb} with Google
      </button>
      <button type="button" onClick={() => handleOAuth('apple')} className={button}>
        <svg
          width="21"
          height="20"
          className="fill-current"
          viewBox="0 0 21 20"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M14.4324 10.6132C14.4249 9.28206 15.0276 8.27835 16.2448 7.53883C15.5638 6.5636 14.5347 6.02694 13.1766 5.92256C11.8908 5.82043 10.4838 6.67029 9.96876 6.67029C9.42447 6.67029 8.17759 5.95856 7.19722 5.95856C5.16847 5.99006 3.01251 7.5771 3.01251 10.8057C3.01251 11.7607 3.18726 12.7472 3.53676 13.7629C4.00388 15.0985 5.68926 18.3721 7.44738 18.3181C8.36663 18.2963 9.01651 17.6656 10.2124 17.6656C11.3721 17.6656 11.9736 18.3181 12.9989 18.3181C14.7728 18.2926 16.2973 15.3162 16.7419 13.9769C14.3626 12.8557 14.4324 10.6817 14.4324 10.6132ZM12.3831 4.66056C13.3717 3.48681 13.2818 2.41831 13.2523 2.03418C12.3794 2.08481 11.3699 2.62856 10.7948 3.29731C10.1614 4.01356 9.78888 4.89956 9.86913 5.90268C10.8128 5.97493 11.6746 5.48918 12.3831 4.66056Z" />
        </svg>
        {verb} with Apple
      </button>
    </div>
  )
}

/**
 * The "Or" rule between the provider grid and the form. Identical on both
 * TailAdmin auth screens; the span's opaque background is what punches the hole
 * in the border line, so it has to track the page background.
 */
export function AuthOrDivider() {
  return (
    <div className="relative py-3 sm:py-5">
      <div className="absolute inset-0 flex items-center">
        <div className="w-full border-t border-gray-200 dark:border-gray-800"></div>
      </div>
      <div className="relative flex justify-center text-sm">
        <span className="bg-white p-2 text-gray-400 dark:bg-gray-900 sm:px-5 sm:py-2">Or</span>
      </div>
    </div>
  )
}

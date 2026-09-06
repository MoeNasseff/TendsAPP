import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'

/**
 * Changing the account password.
 *
 * The TailAdmin source's own "Change Password" button is dead — it opens
 * nothing on the live demo. This is the real flow behind the cloned control.
 *
 * **Why the current password is verified first.** `supabase.auth.updateUser`
 * will happily change the password of whoever holds the session, without
 * asking what the old one was. That means an unlocked, unattended browser is
 * enough to lock the real owner out of their own account. Supabase has no
 * "verify current password" call, so the check is a re-authentication:
 * `signInWithPassword` with the session's own email. It succeeds or it does
 * not, and it costs one round trip.
 *
 * That re-auth issues a fresh session for the same user, which is harmless —
 * it is the same account, and `onAuthStateChange` in AuthProvider swaps the
 * token in place.
 */

export interface PasswordChangeResult {
  ok: boolean
  error: string | null
}

/** Supabase's own default floor. Stated here so the UI can say it up front. */
export const MIN_PASSWORD_LENGTH = 8

export function usePasswordChange() {
  const { user } = useAuth()
  const [saving, setSaving] = useState(false)

  async function changePassword(current: string, next: string, confirm: string): Promise<PasswordChangeResult> {
    if (!user?.email) return { ok: false, error: 'Not signed in.' }

    // Checked before any network call: these are the user's own typos and
    // there is nothing to ask the server about.
    if (next.length < MIN_PASSWORD_LENGTH) {
      return { ok: false, error: `New password must be at least ${MIN_PASSWORD_LENGTH} characters.` }
    }
    if (next !== confirm) {
      return { ok: false, error: 'The two new passwords do not match.' }
    }
    if (next === current) {
      return { ok: false, error: 'The new password is the same as the current one.' }
    }

    setSaving(true)
    try {
      // Step 1 — prove the person at the keyboard knows the current password.
      const { error: reauthError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: current,
      })
      if (reauthError) {
        // Deliberately not echoing Supabase's message here. It distinguishes
        // "invalid credentials" from other failures in ways that are useful
        // to an attacker and confusing to the owner.
        return { ok: false, error: 'Current password is incorrect.' }
      }

      // Step 2 — set the new one.
      const { error: updateError } = await supabase.auth.updateUser({ password: next })
      if (updateError) return { ok: false, error: updateError.message }

      return { ok: true, error: null }
    } finally {
      setSaving(false)
    }
  }

  /**
   * The recovery-link path. A user arriving from "Forgot password?" holds a
   * temporary session and by definition cannot supply the old password, so
   * there is nothing to re-authenticate against — the emailed link is the
   * proof. Kept separate from `changePassword` rather than adding a flag, so
   * the re-auth step cannot be skipped by accident on the normal path.
   */
  async function setPasswordAfterRecovery(next: string, confirm: string): Promise<PasswordChangeResult> {
    if (next.length < MIN_PASSWORD_LENGTH) {
      return { ok: false, error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.` }
    }
    if (next !== confirm) return { ok: false, error: 'The two passwords do not match.' }

    setSaving(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: next })
      return error ? { ok: false, error: error.message } : { ok: true, error: null }
    } finally {
      setSaving(false)
    }
  }

  return { changePassword, setPasswordAfterRecovery, saving }
}

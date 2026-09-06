import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { useProfile, type Profile } from '../../hooks/useProfile'
import { useToast } from '../../hooks/useToast'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { Modal } from '../../components/Modal'
import { PageHeader } from '../../components/PageHeader'
import { PageSkeleton } from '../../components/PageSkeleton'
import { AddressCard, DangerZoneCard, MetaInfoCard, SecurityCard } from './ProfileCards'
import { MIN_PASSWORD_LENGTH, usePasswordChange } from './usePasswordChange'

/**
 * `/profile` — cloned from https://react-demo.tailadmin.com/profile.
 *
 * Divergences from the source, all deliberate:
 *
 * 1. **The Change Password button is wired to a real flow.** The source's own
 *    button is dead — clicking it on the live demo opens nothing. Building the
 *    flow behind it was the point of this work.
 * 2. **Demo data replaced with the signed-in user's.** The source hardcodes
 *    "Musharof Chowdhury" / "randomuser@pimjo.com" / a Pimjo address. Those
 *    fields are now real columns (20260906130000_profile_fields.sql); anything
 *    unset renders as an em dash rather than someone else's details.
 * 3. **Social links render only when set**, and point at the user's own URLs
 *    rather than the source's hardcoded Pimjo accounts.
 * 4. **The project's own `Modal` is used** for the edit dialogs instead of
 *    transcribing TailAdmin's modal component — the app already has one, and
 *    two modal implementations would drift.
 * 5. **The Security card's description copy is corrected.** The source reads
 *    "Receive real-time notifications and team alerts." under Change Password,
 *    which is pasted from a notifications row and is simply wrong.
 * 6. **2FA is a disabled stub** — this app has no enrolment flow. Rendered in
 *    the source's off state but non-interactive, rather than a toggle that
 *    silently does nothing.
 * 7. **Delete account is a stub.** It needs a server-side cascade and a real
 *    decision about data retention; a button that half-deletes an account is
 *    worse than one that explains it is not built.
 * 8. The source's `border-gray-20` typo on the avatar is reproduced verbatim —
 *    see ProfileCards.tsx.
 *
 * Not cloned: the source's page-level `PageBreadcrumb` ("Home / Profile"),
 * because this app uses `PageHeader` on every page and has no breadcrumb
 * component.
 */

const INPUT =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-theme-sm text-gray-800 outline-none focus:border-brand-500 dark:border-white/10 dark:bg-white/5 dark:text-white/90'
const LABEL = 'text-theme-sm font-medium text-gray-700 dark:text-gray-300'
const PRIMARY_BTN =
  'rounded-lg bg-brand-500 px-3.5 py-2 text-theme-sm font-medium text-white hover:bg-brand-600 disabled:opacity-60'
const CANCEL_BTN =
  'rounded-lg border border-gray-300 px-3.5 py-2 text-theme-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-white/10 dark:text-gray-300 dark:hover:bg-white/5'

type EditTarget = 'personal' | 'address' | null

export function ProfilePage() {
  const { user } = useAuth()
  const { profile, loading, updateProfile } = useProfile()
  const showToast = useToast()
  const { changePassword, saving } = usePasswordChange()

  const [editing, setEditing] = useState<EditTarget>(null)
  const [draft, setDraft] = useState<Partial<Profile>>({})
  const [pwOpen, setPwOpen] = useState(false)
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [pwError, setPwError] = useState<string | null>(null)
  const [logoutOpen, setLogoutOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  if (loading) return <PageSkeleton />

  function openEdit(target: Exclude<EditTarget, null>) {
    setDraft({ ...profile })
    setEditing(target)
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault()
    const { error } = await updateProfile(draft)
    showToast(error ? error.message : 'Profile updated.', error ? 'error' : 'success')
    if (!error) setEditing(null)
  }

  function openPassword() {
    setCurrent('')
    setNext('')
    setConfirm('')
    setPwError(null)
    setPwOpen(true)
  }

  async function submitPassword(e: React.FormEvent) {
    e.preventDefault()
    setPwError(null)
    const result = await changePassword(current, next, confirm)
    if (!result.ok) {
      setPwError(result.error)
      return
    }
    setPwOpen(false)
    showToast('Password changed.', 'success')
  }

  /**
   * `scope: 'global'` revokes every refresh token for the user, so other
   * devices are signed out too — which is what the row says it does. The
   * default (`local`) would only end this tab's session and quietly not
   * deliver what the label promises.
   */
  async function logoutEverywhere() {
    const { error } = await supabase.auth.signOut({ scope: 'global' })
    if (error) showToast(error.message, 'error')
    setLogoutOpen(false)
  }

  const field = (key: keyof Profile) => (draft[key] as string | null) ?? ''
  const set = (key: keyof Profile) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setDraft((d) => ({ ...d, [key]: e.target.value || null }))

  return (
    <div className="flex flex-col gap-6">
      <PageHeader eyebrow="ACCOUNT" title="Profile" />

      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] lg:p-6">
        <h3 className="mb-5 text-lg font-semibold text-gray-800 dark:text-white/90 lg:mb-7">Profile</h3>
        <div className="space-y-6">
          <MetaInfoCard profile={profile} email={user?.email ?? null} onEdit={() => openEdit('personal')} />
          <AddressCard profile={profile} onEdit={() => openEdit('address')} />
          <SecurityCard onChangePassword={openPassword} />
          <DangerZoneCard onLogoutAll={() => setLogoutOpen(true)} onDeleteAccount={() => setDeleteOpen(true)} />
        </div>
      </div>

      {/* ---- Edit personal information ---- */}
      <Modal open={editing === 'personal'} onClose={() => setEditing(null)} title="Edit Personal Information">
        <form onSubmit={saveEdit} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5">
              <span className={LABEL}>First Name</span>
              <input className={INPUT} value={field('first_name')} onChange={set('first_name')} />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className={LABEL}>Last Name</span>
              <input className={INPUT} value={field('last_name')} onChange={set('last_name')} />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className={LABEL}>Phone</span>
              <input className={INPUT} value={field('phone')} onChange={set('phone')} />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className={LABEL}>Bio</span>
              <input className={INPUT} value={field('bio')} onChange={set('bio')} />
            </label>
          </div>

          <p className="text-theme-xs text-gray-500 dark:text-gray-400">
            Email is managed by your sign-in and is not editable here.
          </p>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5">
              <span className={LABEL}>Facebook</span>
              <input className={INPUT} value={field('social_facebook')} onChange={set('social_facebook')} placeholder="https://…" />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className={LABEL}>X</span>
              <input className={INPUT} value={field('social_x')} onChange={set('social_x')} placeholder="https://…" />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className={LABEL}>LinkedIn</span>
              <input className={INPUT} value={field('social_linkedin')} onChange={set('social_linkedin')} placeholder="https://…" />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className={LABEL}>Instagram</span>
              <input className={INPUT} value={field('social_instagram')} onChange={set('social_instagram')} placeholder="https://…" />
            </label>
          </div>

          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setEditing(null)} className={CANCEL_BTN}>
              Close
            </button>
            <button type="submit" className={PRIMARY_BTN}>
              Save Changes
            </button>
          </div>
        </form>
      </Modal>

      {/* ---- Edit address ---- */}
      <Modal open={editing === 'address'} onClose={() => setEditing(null)} title="Edit Address">
        <form onSubmit={saveEdit} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5">
              <span className={LABEL}>Country</span>
              <input className={INPUT} value={field('country')} onChange={set('country')} />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className={LABEL}>City/State</span>
              <input className={INPUT} value={field('city_state')} onChange={set('city_state')} />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className={LABEL}>Postal Code</span>
              <input className={INPUT} value={field('postal_code')} onChange={set('postal_code')} />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className={LABEL}>TAX ID</span>
              <input className={INPUT} value={field('tax_id')} onChange={set('tax_id')} />
            </label>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setEditing(null)} className={CANCEL_BTN}>
              Close
            </button>
            <button type="submit" className={PRIMARY_BTN}>
              Save Changes
            </button>
          </div>
        </form>
      </Modal>

      {/* ---- Change password: the flow the source's button never had ---- */}
      <Modal open={pwOpen} onClose={() => setPwOpen(false)} title="Change Password">
        <form onSubmit={submitPassword} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className={LABEL}>Current password</span>
            <input
              type="password"
              autoComplete="current-password"
              className={INPUT}
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              autoFocus
            />
            <span className="text-theme-xs text-gray-500 dark:text-gray-400">
              Asked for so that an unlocked, unattended browser is not enough to lock you out of your own account.
            </span>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className={LABEL}>New password</span>
            <input
              type="password"
              autoComplete="new-password"
              className={INPUT}
              value={next}
              onChange={(e) => setNext(e.target.value)}
            />
            <span className="text-theme-xs text-gray-500 dark:text-gray-400">
              At least {MIN_PASSWORD_LENGTH} characters.
            </span>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className={LABEL}>Confirm new password</span>
            <input
              type="password"
              autoComplete="new-password"
              className={INPUT}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </label>

          {pwError && <p className="text-theme-xs text-error-500">{pwError}</p>}

          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setPwOpen(false)} className={CANCEL_BTN}>
              Cancel
            </button>
            <button type="submit" disabled={saving} className={PRIMARY_BTN}>
              {saving ? 'Changing…' : 'Change Password'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={logoutOpen}
        title="Sign out everywhere?"
        message="Every signed-in device, including this one, is signed out. Your data is untouched — you just sign back in."
        confirmLabel="Sign out everywhere"
        onCancel={() => setLogoutOpen(false)}
        onConfirm={logoutEverywhere}
      />

      {/* Stub — deleting an account needs a server-side cascade across every
          table and a decision about what is retained. Explained rather than
          half-wired: a delete button that only partly works is worse than one
          that says it is not built. */}
      <ConfirmDialog
        open={deleteOpen}
        title="Account deletion isn't built yet"
        message="This needs to remove your expenses, receipts, accounts and bank messages together, and that cascade doesn't exist yet. Nothing has been deleted."
        confirmLabel="OK"
        onCancel={() => setDeleteOpen(false)}
        onConfirm={() => setDeleteOpen(false)}
      />
    </div>
  )
}

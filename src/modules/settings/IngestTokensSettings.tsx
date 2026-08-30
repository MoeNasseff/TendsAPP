import { useState } from 'react'
import { Card } from '../../components/Card'
import { useToast } from '../../hooks/useToast'
import { formatDateTime } from '../../lib/format'
import { useIngestTokens } from '../inbox/useIngestTokens'

/**
 * Manages the credentials the iOS Shortcut authenticates with — see
 * docs/ios-sms-shortcut.md. Without this, a token could only be minted by
 * hand-computing a SHA-256 hash and inserting it via SQL, which makes the
 * whole feature unreachable by anyone who isn't editing the database
 * directly. Added alongside the setup guide for exactly that reason.
 */
export function IngestTokensSettings() {
  const { tokens, loading, createToken, revokeToken } = useIngestTokens()
  const showToast = useToast()
  const [label, setLabel] = useState('')
  const [creating, setCreating] = useState(false)
  const [revealedToken, setRevealedToken] = useState<string | null>(null)

  if (loading) return null

  async function handleCreate() {
    setCreating(true)
    const { raw, error } = await createToken(label)
    setCreating(false)
    if (error) {
      showToast(error.message, 'error')
      return
    }
    setRevealedToken(raw)
    setLabel('')
  }

  async function handleCopy() {
    if (!revealedToken) return
    await navigator.clipboard.writeText(revealedToken)
    showToast('Copied', 'success')
  }

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Shortcut access tokens</h2>
        <p className="text-xs text-slate-500 dark:text-white/50">
          The iOS Shortcut that forwards bank texts authenticates with one of these instead of your
          account password — see docs/ios-sms-shortcut.md for setup.
        </p>
      </div>

      {revealedToken && (
        <div className="flex flex-col gap-2 rounded-lg border border-brand-500/30 bg-brand-500/5 p-3">
          <p className="text-xs font-medium text-slate-700 dark:text-white/80">
            Copy this now — it won&rsquo;t be shown again.
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 overflow-x-auto rounded-md bg-black/5 px-2 py-1.5 text-xs text-slate-800 dark:bg-black/30 dark:text-white/90">
              {revealedToken}
            </code>
            <button
              type="button"
              onClick={handleCopy}
              className="shrink-0 rounded-lg border border-black/10 px-3 py-1.5 text-xs font-medium text-slate-600 hover:border-black/20 dark:border-white/10 dark:text-white/70"
            >
              Copy
            </button>
          </div>
          <button
            type="button"
            onClick={() => setRevealedToken(null)}
            className="self-start text-xs text-slate-500 hover:underline dark:text-white/50"
          >
            Done, hide this
          </button>
        </div>
      )}

      <div className="flex gap-2">
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Label, e.g. iPhone Shortcut"
          aria-label="New token label"
          className="form-input flex-1 rounded-lg border border-black/10 bg-black/[0.02] px-3 py-2 text-sm text-slate-900 outline-hidden dark:border-white/10 dark:bg-black/20 dark:text-slate-200"
        />
        <button
          type="button"
          onClick={handleCreate}
          disabled={creating}
          className="tap-target shrink-0 rounded-lg bg-brand-500 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-brand-600 disabled:opacity-40"
        >
          {creating ? 'Creating…' : 'New token'}
        </button>
      </div>

      {tokens.length > 0 && (
        <div className="flex flex-col gap-3">
          {tokens.map((t) => (
            <div key={t.id} className="flex items-center justify-between gap-3 text-xs">
              <div className="min-w-0">
                <p className="truncate font-medium text-slate-700 dark:text-white/80">
                  {t.label || 'Untitled token'}
                  {t.revoked_at && <span className="ml-2 text-red-500 dark:text-red-400">Revoked</span>}
                </p>
                <p className="text-slate-500 dark:text-white/50">
                  Created {formatDateTime(t.created_at)}
                  {t.last_used_at ? ` · Last used ${formatDateTime(t.last_used_at)}` : ' · Never used'}
                </p>
              </div>
              {!t.revoked_at && (
                <button
                  type="button"
                  onClick={() => revokeToken(t.id)}
                  className="shrink-0 text-red-600 hover:opacity-80 dark:text-red-400"
                >
                  Revoke
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}

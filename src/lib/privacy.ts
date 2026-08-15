/**
 * Privacy mode: blurs sensitive values (amounts, measurements) until tapped.
 *
 * Deliberately not biometric — there is no WebAuthn in this app. This is a
 * shoulder-surfing guard, not an access control, and must not be relied on as
 * one: the values are in the DOM either way, only visually obscured.
 *
 * Implemented as a module-level store read through useSyncExternalStore rather
 * than a context provider, so nothing has to be threaded through App.tsx and
 * any component can opt in on its own.
 */
const STORAGE_KEY = 'tend:privacy'

const listeners = new Set<() => void>()

function readInitial(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1'
  } catch {
    // Safari private mode throws on localStorage access rather than returning null.
    return false
  }
}

let hidden = readInitial()

export function subscribePrivacy(onChange: () => void) {
  listeners.add(onChange)
  return () => {
    listeners.delete(onChange)
  }
}

export function getPrivacySnapshot() {
  return hidden
}

export function togglePrivacy() {
  hidden = !hidden
  try {
    localStorage.setItem(STORAGE_KEY, hidden ? '1' : '0')
  } catch {
    // Preference simply does not survive a reload when storage is unavailable.
  }
  for (const listener of listeners) listener()
}

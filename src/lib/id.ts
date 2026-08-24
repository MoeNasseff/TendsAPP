/**
 * A v4 UUID, with a fallback for insecure origins.
 *
 * `crypto.randomUUID()` is gated on a secure context, so it is undefined over
 * plain HTTP — which is exactly what testing the app on a phone via the LAN
 * address does. Calling it there throws, and a caller that mints an id as its
 * first statement fails before it can render anything, so the failure is
 * completely silent.
 *
 * `crypto.getRandomValues()` carries no such gate, so the fallback is still
 * cryptographically random — not `Math.random()`. The output must stay a
 * valid UUID: `receipts.client_ref` is a `uuid` column, and the idempotency
 * guarantee on (user_id, client_ref) rests on it.
 */
export function newId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  const bytes = crypto.getRandomValues(new Uint8Array(16))
  // Version 4, variant 10xx — the two fields randomUUID would set itself.
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80

  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

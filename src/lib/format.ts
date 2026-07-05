export function formatCurrency(amount: number, currency = 'EGP') {
  return `${currency} ${amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
}

export function formatDate(iso: string | null | undefined) {
  if (!iso) return 'N/A'
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function formatDateTime(iso: string | null | undefined) {
  if (!iso) return 'N/A'
  const d = new Date(iso)
  return (
    d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) +
    ' ' +
    d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  )
}

export function getTimeLeft(date: Date) {
  const diff = date.getTime() - Date.now()
  if (diff < 0) return 'Overdue'
  const days = Math.floor(diff / 86_400_000)
  const hours = Math.floor((diff % 86_400_000) / 3_600_000)
  if (days > 0) return `${days}d ${hours}h`
  const mins = Math.floor((diff % 3_600_000) / 60_000)
  return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`
}

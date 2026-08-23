import { useCallback, useRef, useState, type ReactNode } from 'react'
import { ToastContext, type ToastItem, type ToastType } from '../hooks/useToast'

// Status colours signal state; the brand accent is reserved for actions and is
// used only by the neutral 'info' variant. See the One Accent Rule in DESIGN.md.
const STYLES: Record<ToastType, string> = {
  success:
    'border-success-500/30 bg-success-50 text-success-600 dark:bg-success-500/10 dark:text-success-500',
  error: 'border-error-500/30 bg-error-50 text-error-600 dark:bg-error-500/10 dark:text-error-500',
  info: 'border-brand-500/30 bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400',
}

const ICONS: Record<ToastType, string> = { success: '✓', error: '✕', info: 'ℹ' }

export function ToastHost({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const nextId = useRef(0)

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = nextId.current++
    setToasts((t) => [...t, { id, message, type }])
    setTimeout(() => {
      setToasts((t) => t.filter((toast) => toast.id !== id))
    }, 3000)
  }, [])

  return (
    <ToastContext.Provider value={{ toasts, showToast }}>
      {children}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`glass animate-toast-in flex min-w-[240px] items-center gap-3 rounded-xl border px-5 py-3 text-sm shadow-xl ${STYLES[toast.type]}`}
          >
            <span className="text-lg font-bold">{ICONS[toast.type]}</span>
            <span>{toast.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

import { useCallback, useRef, useState, type ReactNode } from 'react'
import { ToastContext, type ToastItem, type ToastType } from '../hooks/useToast'

const STYLES: Record<ToastType, string> = {
  success: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
  error: 'border-red-500/30 bg-red-500/10 text-red-300',
  info: 'border-brand-primary/30 bg-brand-primary/10 text-brand-primary',
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

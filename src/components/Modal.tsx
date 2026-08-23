import type { ReactNode } from 'react'
import { X } from 'lucide-react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { DUR, EASE } from '../lib/motion'
import { Portal } from './Portal'

export function Modal({
  open,
  onClose,
  title,
  children,
  size = 'md',
}: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  size?: 'md' | 'lg'
}) {
  const reduce = useReducedMotion()

  return (
    <AnimatePresence>
      {open && (
        <Portal>
          <motion.div
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reduce ? undefined : { opacity: 0 }}
            transition={{ duration: DUR.fast, ease: EASE }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
            onClick={onClose}
          >
            <motion.div
              initial={reduce ? false : { opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={reduce ? undefined : { opacity: 0, scale: 0.98 }}
              transition={{ duration: DUR.base, ease: EASE }}
              className={`max-h-[85svh] w-full overflow-y-auto rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-lg dark:border-white/10 dark:bg-gray-900 dark:shadow-none ${
                size === 'lg' ? 'max-w-3xl' : 'max-w-lg'
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-4 flex items-center justify-between gap-3">
                <h3 className="text-display-sm font-semibold text-gray-900 dark:text-white">{title}</h3>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close"
                  className="tap-target rounded-lg p-1.5 text-gray-500 transition-colors duration-fast ease-out-expo hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-200"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              {children}
            </motion.div>
          </motion.div>
        </Portal>
      )}
    </AnimatePresence>
  )
}

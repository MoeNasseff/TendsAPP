import { Children, type ReactNode } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { DUR, EASE } from '../lib/motion'

const container = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.04 } },
}

const item = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: DUR.base, ease: EASE } },
}

/** Stat card grid shared by every module page. Staggers children by 40ms on
 * mount, capped well under 200ms total for four cards. No-ops entirely under
 * prefers-reduced-motion. */
export function StatGrid({ children }: { children: ReactNode }) {
  const reduce = useReducedMotion()

  if (reduce) {
    return <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{children}</div>
  }

  return (
    <motion.div
      className="grid grid-cols-2 gap-3 sm:grid-cols-4"
      initial="hidden"
      animate="visible"
      variants={container}
    >
      {Children.map(children, (child) => (
        <motion.div variants={item}>{child}</motion.div>
      ))}
    </motion.div>
  )
}

export const DUR = { fast: 0.2, base: 0.3, slow: 0.4 } as const
export const EASE = [0.22, 1, 0.36, 1] as const // matches --ease-out

export const fadeUp = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: DUR.base, ease: EASE },
}

export const fade = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  transition: { duration: DUR.base, ease: EASE },
}

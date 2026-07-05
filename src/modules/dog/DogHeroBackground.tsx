import { Canvas, useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'

function useEmojiTexture(emoji: string) {
  return useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 64
    canvas.height = 64
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.font = '44px sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(emoji, 32, 34)
    }
    return new THREE.CanvasTexture(canvas)
  }, [emoji])
}

const reducedMotion =
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

function FloatingSprite({ emoji, initial }: { emoji: string; initial: [number, number, number] }) {
  const texture = useEmojiTexture(emoji)
  const ref = useRef<THREE.Sprite>(null)
  const speed = useMemo(() => 0.15 + Math.random() * 0.15, [])
  const drift = useMemo(() => (Math.random() - 0.5) * 0.1, [])

  useFrame((_, delta) => {
    if (reducedMotion || !ref.current) return
    ref.current.position.y += speed * delta
    ref.current.position.x += drift * delta
    if (ref.current.position.y > 6) ref.current.position.y = -6
  })

  return (
    <sprite ref={ref} position={initial} scale={[1.2, 1.2, 1.2]}>
      <spriteMaterial map={texture} transparent opacity={0.3} depthWrite={false} />
    </sprite>
  )
}

const SPRITES: { emoji: string; pos: [number, number, number] }[] = Array.from({ length: 16 }).map((_, i) => ({
  emoji: i % 2 === 0 ? '🐾' : '🦴',
  pos: [(Math.random() - 0.5) * 12, (Math.random() - 0.5) * 10, -1],
}))

export function DogHeroBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-2xl">
      <Canvas camera={{ position: [0, 0, 5], fov: 50 }}>
        {SPRITES.map((s, i) => (
          <FloatingSprite key={i} emoji={s.emoji} initial={s.pos} />
        ))}
      </Canvas>
    </div>
  )
}

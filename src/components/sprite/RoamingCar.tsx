import { SpriteAnimator } from './SpriteAnimator'
import { SpriteRoamer } from './SpriteRoamer'
import { CAR } from '../../lib/sprite/animations'

/**
 * The Car tab's Ateca, driving back and forth across the page.
 *
 * Locked to the horizontal axis: the source art has only side, front and rear
 * views with no turning frames, so a car that drifted vertically would look
 * like it was sliding sideways. It drives while moving and blinks its
 * headlights while parked, which is the honest extent of what the sheet holds.
 */
export function RoamingCar({ scale = 0.5 }: { scale?: number }) {
  return (
    <SpriteRoamer axis="x" speed={0.12} pauseMinMs={3000} pauseMaxMs={7000} opacity={0.9}>
      {({ moving }) => (
        <SpriteAnimator
          key={moving ? 'driving' : 'parked'}
          image={moving ? CAR.driving : CAR.headlightsBlink}
          scale={scale}
        />
      )}
    </SpriteRoamer>
  )
}

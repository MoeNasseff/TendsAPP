/**
 * One-off generator: rasterizes public/brand/favicon.svg into the PWA PNG
 * icon set. Run manually with `npm run gen-icons` whenever the source
 * logo/monogram changes shape (not part of the dev/build pipeline).
 */
import sharp from 'sharp'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const brandDir = resolve(import.meta.dirname, '../public/brand')

const faviconSvg = readFileSync(resolve(brandDir, 'favicon.svg'))

// Maskable source: same monogram, but on a square (non-rounded) full-bleed
// background so the OS-applied mask doesn't double-clip the corners, with
// the glyph kept inside the ~80% safe-zone circle.
const maskableSvg = Buffer.from(`
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" fill="#278276"/>
  <g transform="translate(256 256) scale(5.4) translate(-32 -32)">
    <path d="M18 21.6C18 20.1641 19.1641 19 20.6 19H43.4C44.8359 19 46 20.1641 46 21.6C46 23.0359 44.8359 24.2 43.4 24.2H35.2V43.4C35.2 44.8359 34.0359 46 32.6 46H31.4C29.9641 46 28.8 44.8359 28.8 43.4V24.2H20.6C19.1641 24.2 18 23.0359 18 21.6Z" fill="#ffffff"/>
  </g>
</svg>`)

async function run() {
  await sharp(faviconSvg).resize(192, 192).png().toFile(resolve(brandDir, 'icon-192.png'))
  await sharp(faviconSvg).resize(512, 512).png().toFile(resolve(brandDir, 'icon-512.png'))
  await sharp(maskableSvg).resize(512, 512).png().toFile(resolve(brandDir, 'icon-maskable.png'))
  console.log('Generated icon-192.png, icon-512.png, icon-maskable.png in public/brand/')
}

run()

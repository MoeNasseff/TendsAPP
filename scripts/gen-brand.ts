/**
 * Reads brand.config.json and generates public/manifest.webmanifest plus
 * patches the <title> and <link rel="icon"> in index.html, so editing
 * brand.config.json alone updates app name/title/favicon/PWA install
 * identity everywhere. Runs via the predev/prebuild npm scripts.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const brand = JSON.parse(readFileSync(resolve(root, 'brand.config.json'), 'utf-8'))

const manifest = {
  name: brand.appName,
  short_name: brand.shortName,
  description: brand.tagline,
  start_url: '/',
  display: 'standalone',
  background_color: brand.colors.brandSecondary,
  theme_color: brand.colors.brandPrimary,
  icons: [
    { src: brand.icon192, sizes: '192x192', type: 'image/png', purpose: 'any' },
    { src: brand.icon512, sizes: '512x512', type: 'image/png', purpose: 'any' },
    { src: brand.iconMaskable, sizes: '512x512', type: 'image/png', purpose: 'maskable' },
  ],
}

writeFileSync(
  resolve(root, 'public/manifest.webmanifest'),
  JSON.stringify(manifest, null, 2) + '\n',
)

const indexPath = resolve(root, 'index.html')
let html = readFileSync(indexPath, 'utf-8')

html = html.replace(/<title>.*<\/title>/, `<title>${brand.appName}</title>`)
html = html.replace(
  /<link rel="icon"[^>]*\/>/,
  `<link rel="icon" type="image/svg+xml" href="${brand.favicon}" />`,
)
if (!html.includes('rel="manifest"')) {
  html = html.replace(
    '</head>',
    `    <link rel="manifest" href="/manifest.webmanifest" />\n  </head>`,
  )
}
if (html.includes('name="theme-color"')) {
  html = html.replace(
    /<meta name="theme-color"[^>]*\/>/,
    `<meta name="theme-color" content="${brand.colors.brandPrimary}" />`,
  )
} else {
  html = html.replace(
    '</head>',
    `    <meta name="theme-color" content="${brand.colors.brandPrimary}" />\n  </head>`,
  )
}
if (html.includes('name="description"')) {
  html = html.replace(/<meta name="description"[^>]*\/>/, `<meta name="description" content="${brand.tagline}" />`)
} else {
  html = html.replace('</head>', `    <meta name="description" content="${brand.tagline}" />\n  </head>`)
}

writeFileSync(indexPath, html)

console.log(`Generated manifest.webmanifest + patched index.html for brand "${brand.appName}"`)

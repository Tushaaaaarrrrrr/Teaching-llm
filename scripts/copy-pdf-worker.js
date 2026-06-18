/**
 * Copies the pdfjs-dist worker into `public/` so it's served from our own
 * origin at `/pdf.worker.min.mjs` with the correct MIME type. Run by the
 * `postinstall` script — no manual steps required.
 *
 * Why same-origin: browsers refuse to load `.mjs` workers when the CDN
 * sends them as `application/octet-stream` or `text/plain` (unpkg has done
 * this for some files), and any CSP that disallows third-party script
 * sources blocks them too. Hosting the file ourselves sidesteps both.
 */
const fs = require('fs')
const path = require('path')

const src = path.join(
  __dirname,
  '..',
  'node_modules',
  'pdfjs-dist',
  'build',
  'pdf.worker.min.mjs',
)
const destDir = path.join(__dirname, '..', 'public')
const dest = path.join(destDir, 'pdf.worker.min.mjs')

if (!fs.existsSync(src)) {
  // pdfjs-dist hasn't been installed yet (postinstall can fire mid-install).
  // Fail soft so the rest of the build doesn't abort.
  console.warn('[copy-pdf-worker] source missing, skipping:', src)
  process.exit(0)
}

fs.mkdirSync(destDir, { recursive: true })
fs.copyFileSync(src, dest)
console.log('[copy-pdf-worker] wrote', dest)

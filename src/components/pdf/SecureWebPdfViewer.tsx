'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'

// react-pdf needs a PDF.js worker. The worker is copied into /public on
// `npm install` by scripts/copy-pdf-worker.js, so we point at the same
// origin. Avoids the CDN MIME-type quirks that caused the viewer to fail
// (browsers refuse .mjs served as application/octet-stream) and any CSP
// that disallows third-party scripts.
pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'

interface Props {
  fileUrl: string           // proxy URL: /api/drive-doc/<contentId>
  watermarkEmail: string    // logged-in user's email
  title?: string            // optional title for the top bar
  onBack?: () => void
}

/**
 * Renders a PDF in the browser via PDF.js, with a tiled email watermark
 * overlaid on every page. Mirrors the Flutter SecurePdfViewer:
 *  - no save / right-click affordances (deterrent, not enforcement)
 *  - watermark on top of the page canvas so screenshots carry the email
 *  - paginated with prev/next + page counter
 *  - responsive (page scales to container width on mobile)
 *
 * Honest caveat: the browser can't replicate FLAG_SECURE. Determined users
 * can OBS the tab or open dev tools and extract the canvas. The watermark
 * exists so that if a leak happens, the email points us at the source.
 */
export default function SecureWebPdfViewer({
  fileUrl,
  watermarkEmail,
  title,
  onBack,
}: Props) {
  const [numPages, setNumPages] = useState<number>(0)
  const [pageNumber, setPageNumber] = useState<number>(1)
  const [error, setError] = useState<string | null>(null)
  // PDF.js fires onLoadProgress while the binary downloads. We surface that
  // as a real percentage in the loading state so the student isn't staring
  // at a static "Loading..." for big files.
  const [loadProgress, setLoadProgress] = useState<number>(0)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [containerWidth, setContainerWidth] = useState<number>(800)

  // Track the wrapper width so the Page scales responsively. ResizeObserver
  // beats window.onResize because the column width can change without the
  // window doing so (sidebar collapse, etc.).
  useEffect(() => {
    if (!containerRef.current) return
    const ro = new ResizeObserver(entries => {
      for (const e of entries) {
        setContainerWidth(Math.min(1200, e.contentRect.width - 48))
      }
    })
    ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [])

  // Ctrl+S / Ctrl+P trap — same posture as the Flutter player's FLAG_SECURE
  // (deterrent only, easily defeated by determined users).
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'p')) {
        e.preventDefault()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Memoise the document options so react-pdf doesn't tear down + re-fetch
  // every render (it compares the object identity).
  const documentOptions = useMemo(
    () => ({
      // PDF.js fetches workers / resources from these paths; keep them
      // pointing at the package's own bundled paths so nothing leaves
      // our domain.
      cMapUrl: '/_next/static/chunks/pages/cmaps/',
      cMapPacked: true,
    }),
    [],
  )

  return (
    <div
      ref={containerRef}
      onContextMenu={e => e.preventDefault()}
      style={{
        position: 'relative',
        width: '100%',
        background: 'var(--bg)',
        color: 'var(--text-primary)',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        // Suppresses iOS' text-selection callout on tap-hold.
        WebkitTouchCallout: 'none' as const,
      }}
    >
      <div
        style={{
          border: '1px solid var(--border)',
          borderRadius: '24px',
          overflow: 'hidden',
          background: 'var(--surface)',
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
        }}
      >
        {/* Top bar / Header */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr auto 1fr',
            alignItems: 'center',
            padding: '14px 20px',
            background: 'var(--surface-2)',
            borderBottom: '1px solid var(--border)',
          }}
        >
          {/* LEFT: Name and page count */}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', minWidth: 0, overflow: 'hidden' }}>
            <span style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {title ?? 'Material'}
            </span>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', opacity: 0.6, userSelect: 'none' }}>·</span>
            {numPages > 0 && (
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 500, whiteSpace: 'nowrap' }}>
                Page {pageNumber} of {numPages}
              </span>
            )}
          </div>

          {/* CENTER: GenZ IITIAN (Perfectly centered) */}
          <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.05em', textTransform: 'uppercase', textAlign: 'center', whiteSpace: 'nowrap', padding: '0 16px', userSelect: 'none' }}>
            GenZ IITIAN
          </div>

          {/* RIGHT: Prev / Next buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
            <button
              onClick={() => setPageNumber(p => Math.max(1, p - 1))}
              disabled={pageNumber <= 1}
              style={pagerBtnStyle(pageNumber <= 1)}
              aria-label="Previous page"
            >
              ‹
            </button>
            <button
              onClick={() => setPageNumber(p => Math.min(numPages, p + 1))}
              disabled={pageNumber >= numPages}
              style={pagerBtnStyle(pageNumber >= numPages)}
              aria-label="Next page"
            >
              ›
            </button>
          </div>
        </div>

        {/* Page render area / Content */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            background: 'var(--bg)',
            padding: '24px 16px',
            minHeight: '500px',
          }}
        >
          {error ? (
            <div style={{ padding: '60px 20px', color: 'var(--text-secondary)', textAlign: 'center' }}>
              <div style={{ fontSize: '18px', fontWeight: 700, marginBottom: 6 }}>Couldn&apos;t load this material</div>
              <div style={{ fontSize: '13px' }}>{error}</div>
            </div>
          ) : (
            <div style={{ position: 'relative', display: 'inline-block' }}>
              <Document
                file={fileUrl}
                options={documentOptions}
                onLoadSuccess={({ numPages: n }) => {
                  setNumPages(n)
                  setLoadProgress(1) // pin to 100 once parse completes
                }}
                onLoadError={e => setError(e?.message || 'Failed to load PDF')}
                onLoadProgress={({ loaded, total }) => {
                  // PDF.js sometimes reports total=0 when the server doesn't
                  // send Content-Length (range responses do). Show an
                  // indeterminate "loaded so far" hint in that case.
                  if (total && total > 0) {
                    setLoadProgress(Math.min(1, loaded / total))
                  } else if (loaded > 0) {
                    // Fake a slow ramp toward 90% so the user sees motion.
                    setLoadProgress(p => Math.min(0.9, p + 0.05))
                  }
                }}
                loading={<LoadingState progress={loadProgress} />}
                error={null}
              >
                <Page
                  pageNumber={pageNumber}
                  width={containerWidth}
                  renderTextLayer={false}
                  renderAnnotationLayer={false}
                  loading={
                    <div style={{ padding: '40px', color: 'var(--text-muted)' }}>
                      Rendering page…
                    </div>
                  }
                />
              </Document>
              {/* Watermark — only mount once the page is laid out, so it sits
                  over the rendered canvas and not over the loader. */}
              {numPages > 0 && <Watermark email={watermarkEmail} />}
            </div>
          )}
        </div>

        {/* Footer pagination */}
        {numPages > 0 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '16px',
              padding: '12px 18px',
              background: 'var(--surface-2)',
              borderTop: '1px solid var(--border)',
            }}
          >
            <button
              onClick={() => setPageNumber(p => Math.max(1, p - 1))}
              disabled={pageNumber <= 1}
              style={{
                background: 'none',
                border: 'none',
                color: pageNumber <= 1 ? 'var(--text-muted)' : 'var(--accent)',
                fontWeight: 600,
                fontSize: '14px',
                cursor: pageNumber <= 1 ? 'default' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                opacity: pageNumber <= 1 ? 0.5 : 1,
              }}
            >
              ‹ Previous
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', color: 'var(--text-secondary)' }}>
              <span>Page</span>
              <input
                type="number"
                min={1}
                max={numPages}
                value={pageNumber}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10)
                  if (!isNaN(val) && val >= 1 && val <= numPages) {
                    setPageNumber(val)
                  }
                }}
                style={{
                  width: '48px',
                  textAlign: 'center',
                  padding: '4px 6px',
                  borderRadius: '6px',
                  border: '1px solid var(--border)',
                  background: 'var(--bg)',
                  color: 'var(--text-primary)',
                  fontSize: '14px',
                  fontWeight: 600,
                  outline: 'none',
                }}
              />
              <span>of {numPages}</span>
            </div>
            <button
              onClick={() => setPageNumber(p => Math.min(numPages, p + 1))}
              disabled={pageNumber >= numPages}
              style={{
                background: 'none',
                border: 'none',
                color: pageNumber >= numPages ? 'var(--text-muted)' : 'var(--accent)',
                fontWeight: 600,
                fontSize: '14px',
                cursor: pageNumber >= numPages ? 'default' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                opacity: pageNumber >= numPages ? 0.5 : 1,
              }}
            >
              Next ›
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function pagerBtnStyle(disabled: boolean): React.CSSProperties {
  return {
    background: disabled ? 'var(--surface-2)' : 'var(--surface-2)',
    color: disabled ? 'var(--text-muted)' : 'var(--text-primary)',
    border: '1px solid var(--border)',
    borderRadius: '10px',
    width: 36,
    height: 36,
    fontSize: '20px',
    fontWeight: 800,
    cursor: disabled ? 'default' : 'pointer',
    opacity: disabled ? 0.5 : 1,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
  }
}

/**
 * Loading panel with a real percentage. PDF.js' onLoadProgress feeds the
 * `progress` prop (0–1). Renders a thin circular ring + a percentage label
 * so the user can see things are actually moving, not just sitting on
 * a spinner.
 */
function LoadingState({ progress }: { progress: number }) {
  const pct = Math.round(progress * 100)
  // SVG circle progress ring: circumference = 2πr; offset shrinks as
  // progress grows so the stroke "fills" clockwise from the top.
  const size = 72
  const stroke = 5
  const r = (size - stroke) / 2
  const circumference = 2 * Math.PI * r
  const dashOffset = circumference * (1 - Math.max(0, Math.min(1, progress)))
  return (
    <div
      style={{
        padding: '60px 20px',
        color: 'var(--text-primary)',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '14px',
      }}
    >
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg
          width={size}
          height={size}
          style={{ transform: 'rotate(-90deg)' }}
          aria-hidden
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="var(--border)"
            strokeWidth={stroke}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="#4F46E5"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            style={{ transition: 'stroke-dashoffset 220ms ease-out' }}
          />
        </svg>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '13px',
            fontWeight: 800,
            color: 'var(--text-primary)',
            fontFeatureSettings: '"tnum"',
          }}
        >
          {pct}%
        </div>
      </div>
      <div style={{ fontSize: '13px', fontWeight: 600 }}>
        {pct < 100 ? 'Loading material…' : 'Rendering page…'}
      </div>
    </div>
  )
}

/**
 * Tiled rotated email overlay — same shape as the Flutter _Watermark widget.
 * `pointer-events: none` so it doesn't break selection or text-layer
 * interactions if you ever turn the text layer back on.
 */
function Watermark({ email }: { email: string }) {
  // Render enough tiles to cover a tall page. We don't measure the page
  // because the Page child sets the canvas size; this overlay's parent is
  // a position: relative inline-block sized by the canvas, so 100% inset
  // covers it exactly.
  const tiles: { left: string; top: string }[] = []
  const rows = 14
  const cols = 4
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      tiles.push({
        left: `${(c / cols) * 100 + (r % 2 === 0 ? 0 : 6)}%`,
        top: `${(r / rows) * 100}%`,
      })
    }
  }
  return (
    <div
      aria-hidden
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        overflow: 'hidden',
      }}
    >
      {tiles.map((t, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: t.left,
            top: t.top,
            transform: 'rotate(-25deg)',
            transformOrigin: 'left top',
            color: 'var(--watermark-color, rgba(0, 0, 0, 0.08))',
            fontSize: '13px',
            fontWeight: 800,
            letterSpacing: '1.2px',
            whiteSpace: 'nowrap',
          }}
        >
          GenZ IITIAN • {email}
        </div>
      ))}
    </div>
  )
}

'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'

// react-pdf needs a PDF.js worker. We point it at a CDN copy pinned to the
// exact pdfjs-dist version we installed — bundling the .mjs worker through
// webpack/Terser fails because the worker uses top-level ES module syntax
// that Terser can't parse in non-module mode. The CDN file is identical to
// the one in node_modules; unpkg honours immutable caching so the round
// trip happens once per user.
pdfjs.GlobalWorkerOptions.workerSrc =
  `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`

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
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [containerWidth, setContainerWidth] = useState<number>(800)

  // Track the wrapper width so the Page scales responsively. ResizeObserver
  // beats window.onResize because the column width can change without the
  // window doing so (sidebar collapse, etc.).
  useEffect(() => {
    if (!containerRef.current) return
    const ro = new ResizeObserver(entries => {
      for (const e of entries) {
        setContainerWidth(Math.min(900, e.contentRect.width - 24))
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
        minHeight: '100vh',
        background: '#0B1020',
        color: '#fff',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        // Suppresses iOS' text-selection callout on tap-hold.
        WebkitTouchCallout: 'none' as const,
      }}
    >
      {/* Top bar */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 5,
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '14px 18px',
          background: 'rgba(11, 16, 32, 0.92)',
          backdropFilter: 'blur(8px)',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        {onBack && (
          <button
            onClick={onBack}
            aria-label="Back"
            style={{
              background: 'rgba(255,255,255,0.08)',
              color: '#fff',
              border: 'none',
              borderRadius: '10px',
              width: 36,
              height: 36,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '14px', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {title ?? 'Material'}
          </div>
          {numPages > 0 && (
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)' }}>
              Page {pageNumber} of {numPages}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
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

      {/* Page render area */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          padding: '20px 12px 60px',
        }}
      >
        {error ? (
          <div style={{ padding: '60px 20px', color: 'rgba(255,255,255,0.7)', textAlign: 'center' }}>
            <div style={{ fontSize: '18px', fontWeight: 700, marginBottom: 6 }}>Couldn&apos;t load this material</div>
            <div style={{ fontSize: '13px' }}>{error}</div>
          </div>
        ) : (
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <Document
              file={fileUrl}
              options={documentOptions}
              onLoadSuccess={({ numPages: n }) => setNumPages(n)}
              onLoadError={e => setError(e?.message || 'Failed to load PDF')}
              loading={
                <div style={{ padding: '40px', color: 'rgba(255,255,255,0.7)' }}>
                  Loading material…
                </div>
              }
              error={null}
            >
              <Page
                pageNumber={pageNumber}
                width={containerWidth}
                renderTextLayer={false}
                renderAnnotationLayer={false}
                loading={
                  <div style={{ padding: '40px', color: 'rgba(255,255,255,0.7)' }}>
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
    </div>
  )
}

function pagerBtnStyle(disabled: boolean): React.CSSProperties {
  return {
    background: disabled ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.12)',
    color: disabled ? 'rgba(255,255,255,0.3)' : '#fff',
    border: 'none',
    borderRadius: '10px',
    width: 36,
    height: 36,
    fontSize: '20px',
    fontWeight: 800,
    cursor: disabled ? 'default' : 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
  }
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
            color: 'rgba(0, 0, 0, 0.10)',
            fontSize: '13px',
            fontWeight: 800,
            letterSpacing: '1.2px',
            whiteSpace: 'nowrap',
          }}
        >
          {email}
        </div>
      ))}
    </div>
  )
}

#!/usr/bin/env node
/*
 * Dark-mode codemod — migrates hardcoded inline-style hex colors to theme tokens.
 *
 * SAFETY RULES:
 *  - Only rewrites SINGLE-quoted hex literals ('#xxxxxx'). SVG presentation
 *    attributes use double quotes (stroke="#..."), where CSS var() is invalid —
 *    so those are never touched.
 *  - White is property-aware: `background/backgroundColor: '#fff'` -> surface,
 *    but `color: '#fff'` is LEFT ALONE (it's almost always text on a colored
 *    button and must stay white).
 *  - Black (#000) and hexes inside compound strings (gradients, box-shadows,
 *    `2px solid #..`) are left alone — handled manually in polish.
 *
 * Usage:  node scripts/dark-mode-codemod.js [--write] <file...>
 *         (omit --write for a dry run that only reports counts)
 */
const fs = require('fs')

const write = process.argv.includes('--write')
const inputs = process.argv.slice(2).filter(a => a !== '--write')

// Never touch these (charts break with var(), content-color palettes, already-dark
// video surfaces, infra files with no colors, in-flight files).
const DENY = [
  'lectures/[lectureId]/play', 'live/[sessionId]', 'reports/page',
  'AnalyticsDashboard', 'RichTextEditor', 'RichTextDisplay', 'MathDisplay',
  'CustomVideoPlayer', 'ThemeProvider', 'CapacitorBridge', 'CsrfProvider',
  'PostHogProvider', 'MobileBlocker', 'AppUpdater',
  '/login/', '/signup/', 'components/auth/',
]
const path = require('path')
function collect(p, acc) {
  let st
  try { st = fs.statSync(p) } catch { return acc }
  if (st.isDirectory()) {
    for (const e of fs.readdirSync(p)) {
      if (e === 'node_modules' || e === '.next' || e === '.git') continue
      collect(path.join(p, e), acc)
    }
  } else if (p.endsWith('.tsx')) {
    if (!DENY.some(d => p.includes(d))) acc.push(p)
  }
  return acc
}
const files = inputs.flatMap(p => collect(p, []))

// value -> token (applied to single-quoted literals, case-insensitive)
const MAP = {
  // text
  '#1e1e3a': 'var(--text-primary)', '#1e293b': 'var(--text-primary)', '#0f172a': 'var(--text-primary)', '#111827': 'var(--text-primary)', '#1f1f3a': 'var(--text-primary)',
  '#6b6b8a': 'var(--text-secondary)', '#64748b': 'var(--text-secondary)', '#475569': 'var(--text-secondary)', '#334155': 'var(--text-secondary)',
  '#9999b0': 'var(--text-muted)', '#94a3b8': 'var(--text-muted)', '#cbd5e1': 'var(--text-muted)', '#b0b2ba': 'var(--text-muted)', '#a0a0b8': 'var(--text-muted)',
  // brand
  '#3636e8': 'var(--primary)', '#4f46e5': 'var(--primary)', '#2525cc': 'var(--primary-dark)', '#6366f1': 'var(--accent)', '#818cf8': 'var(--accent)',
  // surfaces / borders
  '#e8eaf0': 'var(--surface-2)', '#e5e7eb': 'var(--surface-2)', '#e2e8f0': 'var(--surface-2)', '#edf0f5': 'var(--surface-2)', '#dde0e8': 'var(--surface-2)', '#eef0f5': 'var(--surface-2)',
  '#f3f4f6': 'var(--bg)',
  '#f8fafc': 'var(--surface)', '#f1f5f9': 'var(--surface)', '#f9fafb': 'var(--surface)', '#fafafa': 'var(--surface)', '#f8f9fc': 'var(--surface)', '#f5f6fa': 'var(--surface)', '#f6f7fb': 'var(--surface)',
  // status
  '#ef4444': 'var(--danger)', '#dc2626': 'var(--danger)', '#e11d48': 'var(--danger)',
  '#10b981': 'var(--success)', '#059669': 'var(--success)', '#16a34a': 'var(--success)', '#22c55e': 'var(--success)',
  '#f59e0b': 'var(--warning)', '#d97706': 'var(--warning)', '#f97316': 'var(--warning)',
  '#3b82f6': 'var(--info)', '#2563eb': 'var(--info)', '#0ea5e9': 'var(--info)',
  // soft tint chips
  '#e0e7ff': 'var(--primary-light)', '#eef2ff': 'var(--primary-light)', '#dbeafe': 'var(--info-light)',
  '#fee2e2': 'var(--danger-light)', '#fef2f2': 'var(--danger-light)',
  '#d1fae5': 'var(--success-light)', '#dcfce7': 'var(--success-light)',
  '#fef3c7': 'var(--warning-light)', '#fffbeb': 'var(--warning-light)',
}

const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

let grand = 0
for (const file of files) {
  let src
  try { src = fs.readFileSync(file, 'utf8') } catch { console.log(`SKIP (missing): ${file}`); continue }
  let out = src
  let n = 0

  // 1) Property-aware white background -> surface
  out = out.replace(/((?:background|backgroundColor)\s*:\s*)'(?:#fff|#ffffff|white)'/gi, (_, p) => { n++; return `${p}'var(--surface)'` })

  // 2) Value-based token swaps (single-quoted only)
  for (const [hex, token] of Object.entries(MAP)) {
    const re = new RegExp("'" + esc(hex) + "'", 'gi')
    out = out.replace(re, () => { n++; return `'${token}'` })
  }

  // 3) Neumorphic shadow glow -> theme-aware neu tokens.
  //    Shadow COLORS always follow a blur radius ("8px #ffffff"), so matching
  //    `<num>px #fff` only hits shadow highlights — never text/fill/border white.
  //    --neu-light/--neu-dark are #ffffff/#c5c7cf in light (no visual change) and
  //    dark surfaces in dark (kills the white halo).
  out = out.replace(/(\d+px\s+)#ffffff\b/gi, (_, p) => { n++; return p + 'var(--neu-light)' })
  out = out.replace(/(\d+px\s+)#fff\b/gi, (_, p) => { n++; return p + 'var(--neu-light)' })
  // These grays are used exclusively as neumorphic shadow colors in this codebase.
  for (const g of ['#c5c7cf', '#bdbfc7', '#c2c4cc']) {
    const re = new RegExp(esc(g), 'gi')
    out = out.replace(re, () => { n++; return 'var(--neu-dark)' })
  }
  // rgba(255,255,255,a) in SHADOW position (preceded by a blur/spread number) is
  // the soft white halo. Only matches after "<num>px " or "<num> " — never a
  // background/border/gradient-stop white. -> var(--neu-glow) (white in light,
  // transparent in dark, so the halo vanishes in dark only).
  out = out.replace(/([\d.]+(?:px)?\s+)rgba\(\s*255\s*,\s*255\s*,\s*255\s*,\s*[\d.]+\s*\)/gi,
    (_, p) => { n++; return p + 'var(--neu-glow)' })

  grand += n
  console.log(`${n.toString().padStart(4)}  ${file}`)
  if (write && n > 0) fs.writeFileSync(file, out)
}
console.log(`---\nTOTAL replacements: ${grand}${write ? ' (written)' : ' (dry run)'}`)

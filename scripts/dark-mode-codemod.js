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
  // Chat bubbles use deliberate constant-dark text on constant-light bubbles
  // (WhatsApp style). The value map would revert those literals and make text
  // invisible, so these files are hand-maintained.
  'community/page', 'support/page',
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
  // more light tints (badge / chip / modal section backgrounds)
  '#ede9fe': 'var(--primary-light)', '#f0f0ff': 'var(--primary-light)', '#f0f4ff': 'var(--primary-light)',
  '#f5f7ff': 'var(--surface)', '#f0f2f8': 'var(--surface)', '#f8f9fa': 'var(--surface)', '#f8faff': 'var(--surface)', '#fafbff': 'var(--surface)',
  '#eff6ff': 'var(--info-light)', '#e0f2fe': 'var(--info-light)', '#f0f9ff': 'var(--info-light)',
  '#f0fdf4': 'var(--success-light)', '#ecfdf5': 'var(--success-light)', '#fff1f2': 'var(--danger-light)',
  '#fff5f5': 'var(--danger-light)', '#fffdf5': 'var(--warning-light)', '#fefce8': 'var(--warning-light)', '#fff7ed': 'var(--warning-light)',
  // darker accent/status text (sits on the light tints above)
  '#7c3aed': 'var(--accent)', '#6d28d9': 'var(--accent)', '#8b5cf6': 'var(--accent)', '#a855f7': 'var(--accent)',
  '#4338ca': 'var(--primary-dark)', '#1e40af': 'var(--info)', '#1d4ed8': 'var(--info)', '#1e3a8a': 'var(--info)',
  '#b91c1c': 'var(--danger)', '#991b1b': 'var(--danger)', '#f43f5e': 'var(--danger)',
  '#15803d': 'var(--success)', '#166534': 'var(--success)', '#047857': 'var(--success)', '#15803c': 'var(--success)',
  '#92400e': 'var(--warning)', '#b45309': 'var(--warning)', '#ea580c': 'var(--warning)', '#c2410c': 'var(--warning)', '#9a3412': 'var(--warning)',
  // grays
  '#d1d5db': 'var(--border)', '#9ca3af': 'var(--text-muted)', '#999': 'var(--text-muted)', '#aaa': 'var(--text-muted)',
  '#6b7280': 'var(--text-secondary)', '#374151': 'var(--text-secondary)', '#4b5563': 'var(--text-secondary)',
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

  // 2b) Brand/status colors written with an 8-digit alpha suffix (e.g.
  //     '#3636e810' = primary @ ~6% as a tint background) -> the *-light tokens.
  for (const [hex6, token] of [['#3636e8', '--primary-light'], ['#6366f1', '--primary-light'], ['#4f46e5', '--primary-light'], ['#ef4444', '--danger-light'], ['#dc2626', '--danger-light'], ['#10b981', '--success-light'], ['#f59e0b', '--warning-light'], ['#3b82f6', '--info-light'], ['#8b5cf6', '--primary-light']]) {
    const re = new RegExp("'" + esc(hex6) + "[0-9a-f]{2}'", 'gi')
    out = out.replace(re, () => { n++; return `'var(${token})'` })
  }

  // 2c) Light border/divider colors that survive inside compound strings
  //     (e.g. "1px solid #e2e8f0"). After the value pass these only remain in
  //     such compound uses -> subtle theme border. Also white borders.
  for (const c of ['#e2e8f0', '#e5e7eb', '#edf0f5', '#f1f5f9', '#eef2ff', '#f0f2f8', '#fecaca', '#fef3c7', '#fde68a', '#bbf7d0', '#bfdbfe', '#c7d2fe', '#fed7aa', '#e0e7ff']) {
    out = out.replace(new RegExp(esc(c), 'gi'), () => { n++; return 'var(--border)' })
  }
  out = out.replace(/(solid\s+)#(?:ffffff|fff)\b/gi, (_, p) => { n++; return p + 'var(--border)' })

  // 3) Neumorphic shadow glow -> theme-aware neu tokens.
  //    Shadow COLORS always follow a blur radius ("8px #ffffff"), so matching
  //    `<num>px #fff` only hits shadow highlights — never text/fill/border white.
  //    --neu-light/--neu-dark are #ffffff/#c5c7cf in light (no visual change) and
  //    dark surfaces in dark (kills the white halo).
  out = out.replace(/(\d+px\s+)#ffffff\b/gi, (_, p) => { n++; return p + 'var(--neu-light)' })
  out = out.replace(/(\d+px\s+)#fff\b/gi, (_, p) => { n++; return p + 'var(--neu-light)' })
  // These grays are used exclusively as neumorphic shadow colors in this codebase.
  for (const g of ['#c5c7cf', '#bdbfc7', '#c2c4cc', '#d1d9e6', '#d1d5db', '#dde0e8', '#b0b2ba', '#dadce4']) {
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

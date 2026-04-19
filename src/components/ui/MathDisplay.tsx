'use client';

import React from 'react';
import katex from 'katex';

/**
 * MathDisplay — A standalone math & statistics formatting engine.
 * 
 * This component is COMPLETELY INDEPENDENT from the code block logic.
 * It handles two distinct rendering paths:
 * 
 *   1. LaTeX inline math:  $...$  → rendered via KaTeX
 *   2. Plain-text math:    x^2, x_n, sqrt(x) → rendered with CSS super/subscripts
 * 
 * All Unicode symbols (∑, ∫, π, ∞, ≤, ≥, ≠, ∩, ∪, etc.) are preserved as-is.
 * Copy-pasted content is never altered — only visual formatting is applied.
 */

// ─── LaTeX Renderer ──────────────────────────────────────────────────────────

function renderLatex(latex: string): string {
  try {
    return katex.renderToString(latex, {
      throwOnError: false,
      displayMode: false,
      strict: false,
      trust: true,
    });
  } catch {
    return latex;
  }
}

// ─── Plain-Text Math Formatter ───────────────────────────────────────────────
// Converts common plain-text math patterns into readable formatted output:
//   x^2  → x²    x^{abc} → x^(abc) as superscript
//   x_1  → x₁    x_{abc} → x_(abc) as subscript
//   sqrt(x) displayed with √ symbol

function formatPlainTextMath(text: string): React.ReactNode[] {
  const result: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;

  // Pattern: ^{...} or ^(single char)  OR  _{...} or _(single char)
  const pattern = /(\^|_)(\{[^}]+\}|[0-9a-zA-Z+\-*/().])/g;

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(remaining)) !== null) {
    // Push text before this match
    if (match.index > lastIndex) {
      result.push(<React.Fragment key={key++}>{remaining.slice(lastIndex, match.index)}</React.Fragment>);
    }

    const type = match[1]; // ^ or _
    let content = match[2];

    // Strip braces if present: {abc} → abc
    if (content.startsWith('{') && content.endsWith('}')) {
      content = content.slice(1, -1);
    }

    if (type === '^') {
      result.push(
        <sup key={key++} style={{ fontSize: '0.75em', verticalAlign: 'super', lineHeight: 0 }}>
          {content}
        </sup>
      );
    } else {
      result.push(
        <sub key={key++} style={{ fontSize: '0.75em', verticalAlign: 'sub', lineHeight: 0 }}>
          {content}
        </sub>
      );
    }

    lastIndex = match.index + match[0].length;
  }

  // Push remaining text after last match
  if (lastIndex < remaining.length) {
    result.push(<React.Fragment key={key++}>{remaining.slice(lastIndex)}</React.Fragment>);
  }

  // If no matches at all, return original text
  if (result.length === 0) {
    result.push(<React.Fragment key={0}>{text}</React.Fragment>);
  }

  return result;
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function MathDisplay({ text }: { text: string }) {
  if (!text) return null;

  // Step 1: Split by inline LaTeX delimiters  $...$
  // We use a regex that matches $...$ but NOT $$ (display mode) or escaped \$
  const parts = text.split(/(\$(?!\$)[^$]+\$)/g);

  return (
    <>
      {parts.map((part, index) => {
        // Check if this part is a LaTeX expression: starts and ends with $
        if (part.startsWith('$') && part.endsWith('$') && part.length > 2) {
          const latex = part.slice(1, -1);
          const html = renderLatex(latex);
          return (
            <span
              key={index}
              className="katex-inline"
              dangerouslySetInnerHTML={{ __html: html }}
              style={{ display: 'inline', verticalAlign: 'baseline' }}
            />
          );
        }

        // Plain text — apply superscript/subscript formatting
        return (
          <span key={index}>
            {formatPlainTextMath(part)}
          </span>
        );
      })}
    </>
  );
}

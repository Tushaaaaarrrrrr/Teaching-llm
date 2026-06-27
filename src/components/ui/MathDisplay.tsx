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

// Helper functions for preprocessing math

function preprocessPlainTextSegment(segment: string): string {
  let text = segment;

  // 1. Wrap LaTeX environment blocks \begin{env} ... \end{env} in display math $$
  text = text.replace(/\\begin\{([a-zA-Z*]+)\}([\s\S]*?)\\end\{\1\}/g, (match) => {
    return `\n$$\n${match}\n$$\n`;
  });

  // 2. Convert plain text square root: sqrt(something) -> $\sqrt{something}$
  let hasSqrt = true;
  let limit = 0;
  while (hasSqrt && limit < 15) {
    const match = text.match(/sqrt\(([^()]+)\)/i);
    if (match) {
      text = text.replace(match[0], `$\\sqrt{${match[1]}}$`);
      limit++;
    } else {
      hasSqrt = false;
    }
  }

  // 3. Convert plain text square root with curly braces: sqrt{something} -> $\sqrt{something}$
  text = text.replace(/sqrt\{([^{}]+)\}/gi, `$\\sqrt{$1}$`);

  // 4. Convert Unicode root symbol with parenthesis or expression:
  // e.g. √(x+1) -> $\sqrt{x+1}$
  text = text.replace(/√\(([^()]+)\)/g, `$\\sqrt{$1}$`);
  // e.g. √x -> $\sqrt{x}$, √25 -> $\sqrt{25}$
  text = text.replace(/√([0-9a-zA-Z]+)/g, `$\\sqrt{$1}$`);

  // 5. Convert standard function names to LaTeX upright font: sin, cos, tan, log, ln, lim, det
  text = text.replace(/\b(sin|cos|tan|log|ln|lim|det)\(([^()]+)\)/gi, (match, func, arg) => {
    return `$\\${func.toLowerCase()}(${arg})$`;
  });

  // 6. Convert simple fractions:
  // (x+1)/(y-1) -> \frac{x+1}{y-1}
  text = text.replace(/\(([^()]+)\)\/\(([^()]+)\)/g, `$\\frac{$1}{$2}$`);
  // x/y or 3/4 (avoiding calendar dates like 12/05)
  text = text.replace(/\b([a-zA-Z0-9]+)\/([a-zA-Z]+|[a-zA-Z0-9]+)\b/g, (match, num, den) => {
    if (/^\d+$/.test(num) && /^\d+$/.test(den)) {
      if (num.length <= 2 && den.length <= 2) return match;
    }
    return `$\\frac{${num}}{${den}}$`;
  });

  // 7. Convert simple math shorthands
  text = text.replace(/-->|->/g, '$\\to$');
  text = text.replace(/=>/g, '$\\Rightarrow$');
  text = text.replace(/\+-/g, '$\\pm$');

  // 8. Convert any general raw LaTeX commands (e.g. \alpha, \frac{a}{b}, \sum_{i=1}^n)
  // Matches any backslash followed by a LaTeX command and its arguments.
  const rawLatexRegex = /(\\[a-zA-Z*]+(?:\s*(?:\{[^{}]*\}|\[[^[\]]*\]|_[a-zA-Z0-9]|_\{[^{}]*\}|\^[a-zA-Z0-9]|\^\{[^{}]*\}|[a-zA-Z0-9+\-*/=<>(),._]))*)/g;
  text = text.replace(rawLatexRegex, (match) => {
    if (match === '\\') return match;
    return `$${match}$`;
  });

  // 9. Convert exponents / subscripts (e.g. x^2, y_i, a^{n+1})
  text = text.replace(/\b([a-zA-Z0-9]+(?:\^)(?:\{[^{}]+\}|[a-zA-Z0-9+\-*/()]+))\b/g, (match) => {
    return `$${match}$`;
  });
  text = text.replace(/\b([a-zA-Z0-9]+(?:_)(?:\{[^{}]+\}|[0-9]+|[a-zA-Z]))\b/g, (match) => {
    return `$${match}$`;
  });

  return text;
}

function preprocessMath(text: string): string {
  if (!text) return '';

  let processed = text;

  // 1. Normalize LaTeX block delimiters:
  // \[ ... \] -> $$ ... $$
  // \( ... \) -> $ ... $
  processed = processed.replace(/\\+\[([\s\S]*?)\\+\]/g, '$$$$$1$$$$');
  processed = processed.replace(/\\+\(([\s\S]*?)\\+\)/g, '$$$1$$');

  // 2. Tokenize the string by existing math delimiters: $$ ... $$ and $ ... $
  // To avoid duplicate wrapping, we only preprocess plain-text segments.
  const parts = processed.split(/(\$\$(?!\$)[^$]+\$\$|\$(?!\$)[^$]+\$)/g);
  
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (!part.startsWith('$')) {
      parts[i] = preprocessPlainTextSegment(part);
    }
  }

  return parts.join('');
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function MathDisplay({ text }: { text: string }) {
  if (!text) return null;

  // Preprocess the text to standardize math formatting and auto-wrap LaTeX/plain-text notation
  const preprocessedText = preprocessMath(text);

  // Split by math blocks: $$...$$ (display math) or $...$ (inline math)
  const parts = preprocessedText.split(/(\$\$(?!\$)[^$]+\$\$|\$(?!\$)[^$]+\$)/g);

  return (
    <>
      {parts.map((part, index) => {
        // Display math block: starts and ends with $$
        if (part.startsWith('$$') && part.endsWith('$$') && part.length > 4) {
          const latex = part.slice(2, -2);
          const html = katex.renderToString(latex, {
            throwOnError: false,
            displayMode: true,
            strict: false,
            trust: true,
          });
          return (
            <div
              key={index}
              className="katex-display"
              dangerouslySetInnerHTML={{ __html: html }}
              style={{ margin: '12px 0', overflowX: 'auto', overflowY: 'hidden' }}
            />
          );
        }

        // Inline math block: starts and ends with $
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

        // Plain text (with fallback superscript/subscript formatting)
        return (
          <span key={index}>
            {formatPlainTextMath(part)}
          </span>
        );
      })}
    </>
  );
}

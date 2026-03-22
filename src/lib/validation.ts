
import DOMPurify from 'isomorphic-dompurify';

/**
 * Utility for input validation and spam prevention
 */

export function validateLength(text: string, max: number): boolean {
  return text.length <= max;
}

/**
 * Basic XSS sanitization - uses DOMPurify for robust protection.
 */
export function sanitizeInput(text: string): string {
  if (!text) return '';
  return DOMPurify.sanitize(text.trim());
}

/**
 * Validates a comment for length, empty content, and repeated characters.
 */
export function validateComment(content: string) {
  const trimmed = content?.trim() || '';
  
  if (trimmed.length < 2) {
    return { error: 'Comment is too short (min 2 characters)' };
  }
  
  if (trimmed.length > 500) {
    return { error: 'Comment is too long (max 500 characters)' };
  }

  // Check for excessive repeated characters (spam pattern)
  // Matches 5 or more identical consecutive characters
  if (/(.)\1{4,}/.test(trimmed)) {
    return { error: 'Repeated characters detected. Please avoid spamming.' };
  }

  return { sanitized: sanitizeInput(trimmed) };
}

/**
 * Validates a search query.
 */
export function validateSearch(query: string) {
  const trimmed = query?.trim() || '';
  
  if (trimmed.length === 0) {
    return { error: 'Search query cannot be empty' };
  }
  
  if (trimmed.length > 100) {
    return { error: 'Search query is too long (max 100 chars)' };
  }

  return { sanitized: trimmed };
}

/**
 * Check Magic Bytes to verify if a buffer is indeed a JPEG, PNG, or PDF
 */
export async function checkMagicBytes(buffer: Buffer): Promise<string | null> {
  const hex = buffer.toString('hex', 0, 4).toUpperCase();
  
  // JPEG: FF D8 FF
  if (hex.startsWith('FFD8FF')) return 'jpg';
  
  // PNG: 89 50 4E 47
  if (hex.startsWith('89504E47')) return 'png';
  
  // PDF: 25 50 44 46 (%PDF)
  if (hex.startsWith('25504446')) return 'pdf';
  
  return null;
}

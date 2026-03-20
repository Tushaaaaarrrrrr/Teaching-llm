
/**
 * Utility for input validation and basic XSS prevention
 */

export function validateLength(text: string, max: number): boolean {
  return text.length <= max;
}

import DOMPurify from 'isomorphic-dompurify';

/**
 * Basic XSS sanitization - uses DOMPurify for robust protection.
 * Note: React/Next.js handles most of this by default in JSX, 
 * but this adds a layer of protection for storage.
 */
export function sanitizeInput(text: string): string {
  if (!text) return '';
  return DOMPurify.sanitize(text);
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

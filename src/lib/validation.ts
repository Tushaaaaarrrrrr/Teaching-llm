
/**
 * Utility for input validation and basic XSS prevention
 */

export function validateLength(text: string, max: number): boolean {
  return text.length <= max;
}

/**
 * Basic XSS sanitization - removes script tags and handles basic escaping
 * Note: React/Next.js handles most of this by default in JSX, 
 * but this adds a layer of protection for storage.
 */
export function sanitizeInput(text: string): string {
  if (!text) return '';
  
  return text
    .replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gim, "")
    .replace(/on\w+="[^"]*"/gim, "")
    .replace(/on\w+='[^']*'/gim, "")
    .replace(/javascript:[^"']*/gim, "");
}

/**
 * Check Magic Bytes to verify if a buffer is indeed a JPEG, PNG, or WebP
 */
export async function checkMagicBytes(buffer: Buffer): Promise<string | null> {
  const hex = buffer.toString('hex', 0, 4).toUpperCase();
  
  // JPEG: FF D8 FF
  if (hex.startsWith('FFD8FF')) return 'jpg';
  
  // PNG: 89 50 4E 47
  if (hex.startsWith('89504E47')) return 'png';
  
  // WebP: RIFF ... WEBP (starts with 52 49 46 46, then distance, then 57 45 42 50)
  if (hex.startsWith('52494646')) {
    const webpHeader = buffer.toString('hex', 8, 12).toUpperCase();
    if (webpHeader === '57454250') return 'webp';
  }
  
  return null;
}

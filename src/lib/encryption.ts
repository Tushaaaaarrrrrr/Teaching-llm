import crypto from 'crypto'

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY

if (!ENCRYPTION_KEY && process.env.NODE_ENV === 'production') {
  throw new Error('ENCRYPTION_KEY environment variable is required in production. Generate one with: openssl rand -hex 16')
}

// Only used as fallback in local development
const EFFECTIVE_KEY = ENCRYPTION_KEY || 'dev-only-fallback-key-32-bytes!'
const IV_LENGTH = 16

export function encryptPassword(text: string): string {
  if (!text) return ''
  // Ensure the key is exactly 32 bytes for AES-256
  const keyBuffer = Buffer.from(EFFECTIVE_KEY.padEnd(32, '0').slice(0, 32))
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv('aes-256-gcm', keyBuffer, iv)
  
  let encrypted = cipher.update(text, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  
  const authTag = cipher.getAuthTag().toString('hex')
  
  return `${iv.toString('hex')}:${authTag}:${encrypted}`
}

export function decryptPassword(encryptedData: string): string {
  if (!encryptedData) return ''
  try {
    const parts = encryptedData.split(':')
    if (parts.length !== 3) return ''
    
    const [ivHex, authTagHex, encryptedText] = parts
    const iv = Buffer.from(ivHex, 'hex')
    const authTag = Buffer.from(authTagHex, 'hex')
    
    // Ensure the key is exactly 32 bytes for AES-256
    const keyBuffer = Buffer.from(EFFECTIVE_KEY.padEnd(32, '0').slice(0, 32))
    const decipher = crypto.createDecipheriv('aes-256-gcm', keyBuffer, iv)
    decipher.setAuthTag(authTag)
    
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    
    return decrypted
  } catch (error) {
    console.error('Decryption failed', error)
    return ''
  }
}

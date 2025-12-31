/**
 * PII Encryption Utility
 *
 * Encrypts/decrypts sensitive personal information (NIK, phone numbers, etc.)
 * Uses AES-256-GCM for authenticated encryption
 *
 * Environment Variables:
 *   PII_ENCRYPTION_KEY - 32-byte hex key (64 characters)
 *                        Generate with: openssl rand -hex 32
 *
 * Usage:
 *   const encrypted = encryptPII(nik)
 *   const decrypted = decryptPII(encrypted)
 */

import crypto from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 16
const AUTH_TAG_LENGTH = 16
const ENCODING = 'hex'

/**
 * Get the encryption key from environment
 * Falls back to a development-only key if not set
 */
function getEncryptionKey(): Buffer {
  const key = process.env.PII_ENCRYPTION_KEY

  if (!key) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'PII_ENCRYPTION_KEY must be set in production! ' +
        'Generate with: openssl rand -hex 32'
      )
    }
    // Development fallback - DO NOT USE IN PRODUCTION
    console.warn('⚠️  Using development PII encryption key - DO NOT USE IN PRODUCTION')
    return crypto.scryptSync('dev-only-key', 'salt', 32)
  }

  // Validate key format (64 hex chars = 32 bytes)
  if (!/^[0-9a-fA-F]{64}$/.test(key)) {
    throw new Error(
      'PII_ENCRYPTION_KEY must be 64 hex characters (32 bytes). ' +
      'Generate with: openssl rand -hex 32'
    )
  }

  return Buffer.from(key, 'hex')
}

/**
 * Encrypt PII data
 * Returns format: iv:authTag:ciphertext (all hex encoded)
 */
export function encryptPII(plaintext: string): string {
  if (!plaintext || typeof plaintext !== 'string') {
    throw new Error('Plaintext must be a non-empty string')
  }

  const key = getEncryptionKey()
  const iv = crypto.randomBytes(IV_LENGTH)

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)

  let encrypted = cipher.update(plaintext, 'utf8', ENCODING)
  encrypted += cipher.final(ENCODING)

  const authTag = cipher.getAuthTag()

  // Format: iv:authTag:ciphertext
  return [
    iv.toString(ENCODING),
    authTag.toString(ENCODING),
    encrypted,
  ].join(':')
}

/**
 * Decrypt PII data
 * Expects format: iv:authTag:ciphertext
 */
export function decryptPII(encryptedData: string): string {
  if (!encryptedData || typeof encryptedData !== 'string') {
    throw new Error('Encrypted data must be a non-empty string')
  }

  const parts = encryptedData.split(':')
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted data format')
  }

  const [ivHex, authTagHex, ciphertext] = parts as [string, string, string]

  const key = getEncryptionKey()
  const iv = Buffer.from(ivHex, ENCODING)
  const authTag = Buffer.from(authTagHex, ENCODING)

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(authTag)

  let decrypted = decipher.update(ciphertext, ENCODING, 'utf8')
  decrypted += decipher.final('utf8')

  return decrypted
}

/**
 * Check if a string is already encrypted (has our format)
 */
export function isEncrypted(value: string): boolean {
  if (!value || typeof value !== 'string') return false

  const parts = value.split(':')
  if (parts.length !== 3) return false

  const ivHex = parts[0]!
  const authTagHex = parts[1]!
  const ciphertext = parts[2]!

  // Check if all parts are valid hex
  const hexPattern = /^[0-9a-fA-F]+$/
  return (
    hexPattern.test(ivHex) &&
    ivHex.length === IV_LENGTH * 2 &&
    hexPattern.test(authTagHex) &&
    authTagHex.length === AUTH_TAG_LENGTH * 2 &&
    hexPattern.test(ciphertext) &&
    ciphertext.length > 0
  )
}

/**
 * Safely encrypt PII - returns original if already encrypted or empty
 */
export function safeEncrypt(value: string | null | undefined): string | null {
  if (!value) return null
  if (isEncrypted(value)) return value
  return encryptPII(value)
}

/**
 * Safely decrypt PII - returns original if not encrypted or empty
 */
export function safeDecrypt(value: string | null | undefined): string | null {
  if (!value) return null
  if (!isEncrypted(value)) return value
  try {
    return decryptPII(value)
  } catch {
    // If decryption fails, return original (might not be encrypted)
    return value
  }
}

/**
 * Mask PII for display (shows only last 4 characters)
 */
export function maskPII(value: string | null | undefined, showLast = 4): string {
  if (!value) return '****'
  const decrypted = safeDecrypt(value) || value
  if (decrypted.length <= showLast) return '*'.repeat(decrypted.length)
  return '*'.repeat(decrypted.length - showLast) + decrypted.slice(-showLast)
}

/**
 * Hash PII for comparison (e.g., deduplication)
 * Uses SHA-256 with a salt derived from the encryption key
 */
export function hashPII(value: string): string {
  if (!value) throw new Error('Value required for hashing')

  const key = getEncryptionKey()
  return crypto
    .createHmac('sha256', key)
    .update(value)
    .digest('hex')
}

/**
 * PII field types for validation
 */
export type PIIFieldType = 'nik' | 'phone' | 'bpjs_id' | 'email'

/**
 * Validate PII format before encryption
 */
export function validatePII(value: string, type: PIIFieldType): boolean {
  switch (type) {
    case 'nik':
      // Indonesian NIK: 16 digits
      return /^\d{16}$/.test(value)
    case 'phone':
      // Indonesian phone: 10-13 digits, optionally with +62 prefix
      return /^(\+62|62|0)?[0-9]{9,12}$/.test(value)
    case 'bpjs_id':
      // BPJS ID: 13 digits
      return /^\d{13}$/.test(value)
    case 'email':
      // Basic email validation
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
    default:
      return true
  }
}

/**
 * Encrypt multiple PII fields in an object
 */
export function encryptPIIFields<T extends Record<string, unknown>>(
  obj: T,
  fields: (keyof T)[]
): T {
  const result = { ...obj }
  for (const field of fields) {
    const value = result[field]
    if (typeof value === 'string' && value) {
      result[field] = safeEncrypt(value) as T[keyof T]
    }
  }
  return result
}

/**
 * Decrypt multiple PII fields in an object
 */
export function decryptPIIFields<T extends Record<string, unknown>>(
  obj: T,
  fields: (keyof T)[]
): T {
  const result = { ...obj }
  for (const field of fields) {
    const value = result[field]
    if (typeof value === 'string' && value) {
      result[field] = safeDecrypt(value) as T[keyof T]
    }
  }
  return result
}

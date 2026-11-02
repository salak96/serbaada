import crypto from 'node:crypto';
import dotenv from 'dotenv';

dotenv.config();

// Ensure 32-byte encryption key from environment or fallback deterministic key
const RAW_KEY = process.env.ENCRYPTION_KEY || 'd7a9b1c3e5f7a2b4c6d8e0f1a3b5c7d9e1f3a5b7c9d1e3f5a7b9c1d3e5f7a2b4';
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const KEY = crypto.createHash('sha256').update(String(RAW_KEY)).digest();

/**
 * Encrypt sensitive credentials (API Key, API Secret) using AES-256-GCM
 */
export function encryptCredential(plaintext) {
  if (!plaintext || typeof plaintext !== 'string') return '';
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
  
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');

  // Format: iv:authTag:encrypted
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

/**
 * Decrypt sensitive credentials inside backend memory only
 */
export function decryptCredential(ciphertext) {
  if (!ciphertext || typeof ciphertext !== 'string') return '';
  const parts = ciphertext.split(':');
  if (parts.length !== 3) {
    // If not encrypted format (legacy/plain), return as-is for backward compatibility
    return ciphertext;
  }

  const [ivHex, authTagHex, encryptedHex] = parts;
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

/**
 * Masks API Key for safe frontend rendering (e.g. "res_****6ba7")
 */
export function maskApiKey(apiKey) {
  if (!apiKey || typeof apiKey !== 'string') return '••••••••';
  if (apiKey.length <= 8) return '••••' + apiKey.slice(-3);
  const prefix = apiKey.slice(0, 4);
  const suffix = apiKey.slice(-4);
  return `${prefix}••••${suffix}`;
}

/**
 * Scans objects/strings and strips any sensitive headers or credentials before logging
 */
export function scrubSensitiveData(data) {
  if (!data) return data;
  if (typeof data === 'string') {
    return data.replace(/(x-api-key|authorization|api_key|token|password|secret)["':\s]+["']?([^"',\s]+)/gi, '$1: [REDACTED]');
  }
  if (typeof data === 'object') {
    const copy = Array.isArray(data) ? [...data] : { ...data };
    for (const key of Object.keys(copy)) {
      const lower = key.toLowerCase();
      if (lower.includes('key') || lower.includes('secret') || lower.includes('password') || lower.includes('token') || lower.includes('auth')) {
        copy[key] = '[REDACTED]';
      } else if (typeof copy[key] === 'object') {
        copy[key] = scrubSensitiveData(copy[key]);
      }
    }
    return copy;
  }
  return data;
}

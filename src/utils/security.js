// Security utilities for input sanitization and protection

// Input validation and sanitization
export function sanitizeInput(input) {
  if (typeof input !== 'string') {
    throw new Error('Input must be a string');
  }

  // Remove potential XSS vectors
  input = input.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  input = input.replace(/on\w+="[^"]*"/g, '');
  input = input.replace(/javascript:/gi, '');
  
  // Limit input length
  const MAX_LENGTH = 5000;
  if (input.length > MAX_LENGTH) {
    input = input.substring(0, MAX_LENGTH);
  }

  return input.trim();
}

// Sanitize HTML content
export function sanitizeHTML(html) {
  const div = document.createElement('div');
  div.textContent = html;
  return div.innerHTML;
}

// API key validation
export function validateApiKey(apiKey) {
  if (!apiKey || typeof apiKey !== 'string') {
    return false;
  }

  // Check for minimum length and format
  const API_KEY_REGEX = /^[A-Za-z0-9-_]{20,}$/;
  return API_KEY_REGEX.test(apiKey);
}

// Validate URL for safety
export function isValidUrl(url) {
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}

// Generate a secure random ID
export function generateSecureId(length = 32) {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

// Rate limiting implementation
export class RateLimiter {
  constructor(maxRequests = 10, timeWindow = 60000) {
    this.maxRequests = maxRequests;
    this.timeWindow = timeWindow;
    this.clients = new Map();
  }

  isAllowed(clientId) {
    if (!this.clients.has(clientId)) {
      this.clients.set(clientId, []);
    }

    const now = Date.now();
    const clientRequests = this.clients.get(clientId);
    
    // Remove old requests
    while (clientRequests.length && clientRequests[0] < now - this.timeWindow) {
      clientRequests.shift();
    }

    if (clientRequests.length >= this.maxRequests) {
      return false;
    }

    clientRequests.push(now);
    return true;
  }

  clearHistory(clientId) {
    this.clients.delete(clientId);
  }
}

export const rateLimiter = new RateLimiter();

// Secure storage helper
export const secureStorage = {
  async setItem(key, value) {
    try {
      // Basic encryption could be added here
      await chrome.storage.local.set({ [key]: value });
      return true;
    } catch (error) {
      console.error('Storage error:', error);
      return false;
    }
  },

  async getItem(key) {
    try {
      const result = await chrome.storage.local.get(key);
      return result[key];
    } catch (error) {
      console.error('Storage error:', error);
      return null;
    }
  }
};

// Content Security Policy helper
export function generateCSP() {
  return {
    'default-src': ["'self'"],
    'script-src': ["'self'"],
    'style-src': ["'self'", "'unsafe-inline'"],
    'img-src': ["'self'", 'data:'],
    'connect-src': ["'self'", 'https://generativelanguage.googleapis.com'],
    'font-src': ["'self'"],
    'object-src': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'none'"],
    'frame-ancestors': ["'none'"],
    'upgrade-insecure-requests': []
  };
}

class SecurityManager {
  static ENCRYPTION_KEY = 'gemini_secure_storage';

  static async encryptApiKey(apiKey) {
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(apiKey);
      
      const key = await this.getEncryptionKey();
      const iv = crypto.getRandomValues(new Uint8Array(12));
      
      const encryptedData = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        data
      );

      const encryptedArray = new Uint8Array(encryptedData);
      const combined = new Uint8Array(iv.length + encryptedArray.length);
      combined.set(iv);
      combined.set(encryptedArray, iv.length);

      return Array.from(combined)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
    } catch (error) {
      console.error('Encryption error:', error);
      return null;
    }
  }

  static async decryptApiKey(encryptedData) {
    try {
      const key = await this.getEncryptionKey();
      const data = new Uint8Array(
        encryptedData.match(/.{1,2}/g).map(byte => parseInt(byte, 16))
      );

      const iv = data.slice(0, 12);
      const ciphertext = data.slice(12);

      const decryptedData = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        key,
        ciphertext
      );

      const decoder = new TextDecoder();
      return decoder.decode(decryptedData);
    } catch (error) {
      console.error('Decryption error:', error);
      return null;
    }
  }

  static async getEncryptionKey() {
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(this.ENCRYPTION_KEY),
      { name: 'PBKDF2' },
      false,
      ['deriveBits', 'deriveKey']
    );

    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: new TextEncoder().encode('gemini_salt'),
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );
  }

  static sanitizeInput(input) {
    if (typeof input !== 'string') return '';
    
    // Remove potential XSS vectors
    return input
      .replace(/[<>]/g, '')  // Remove < and >
      .replace(/javascript:/gi, '')  // Remove javascript: protocol
      .replace(/data:/gi, '')  // Remove data: protocol
      .replace(/\b(on\w+)=/gi, '')  // Remove event handlers
      .trim();
  }

  static validateApiKey(apiKey) {
    // Basic validation for Gemini API key format
    const keyPattern = /^[A-Za-z0-9_-]{30,}$/;
    return keyPattern.test(apiKey);
  }

  static validateUrl(url) {
    try {
      const parsedUrl = new URL(url);
      return parsedUrl.protocol === 'https:';
    } catch {
      return false;
    }
  }

  static generateNonce() {
    return Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }
}

export default SecurityManager;

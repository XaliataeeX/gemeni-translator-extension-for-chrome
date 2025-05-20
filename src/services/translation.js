import { getApiConfig, getStorageKeys } from '../utils/config.js';
import { rateLimiter, sanitizeInput, validateApiKey } from '../utils/security';
import { ErrorTypes, createError, retry } from '../utils/error-handler';
import { isRTLLanguage } from '../utils/languages';

// Cache implementation
// TODO: Get these from configManager as well
const CACHE_MAX_AGE = 24 * 60 * 60 * 1000; // 24 hours
const CACHE_MAX_SIZE = 100;

class TranslationCache {
  constructor() {
    this.cache = new Map();
  }

  getKey(text, targetLang) {
    return `${text}:${targetLang}`;
  }

  get(text, targetLang) {
    const key = this.getKey(text, targetLang);
    const item = this.cache.get(key);
    
    if (!item) return null;
    
    if (Date.now() - item.timestamp > CACHE_MAX_AGE) {
      this.cache.delete(key);
      return null;
    }
    
    return item.translation;
  }

  set(text, targetLang, translation) {
    if (this.cache.size >= CACHE_MAX_SIZE) {
      // Remove oldest entry
      const oldestKey = Array.from(this.cache.entries())
        .sort(([, a], [, b]) => a.timestamp - b.timestamp)[0][0];
      this.cache.delete(oldestKey);
    }
    
    const key = this.getKey(text, targetLang);
    this.cache.set(key, {
      translation,
      timestamp: Date.now()
    });
  }

  clear() {
    this.cache.clear();
  }
}

const translationCache = new TranslationCache();

// Performance monitoring
const performance = {
  metrics: new Map(),
  
  startTimer(id) {
    this.metrics.set(id, {
      startTime: Date.now(),
      endTime: null
    });
  },
  
  endTimer(id) {
    const metric = this.metrics.get(id);
    if (metric) {
      metric.endTime = Date.now();
      metric.duration = metric.endTime - metric.startTime;
      
      // Log if translation takes too long
      if (metric.duration > 5000) {
        console.warn(`Translation took ${metric.duration}ms to complete`);
      }
    }
  }
};

// Export functionality
// export async function translateText(text, targetLang, useCache = true) {
//   const perfId = Date.now();
//   performance.startTimer(perfId);
  
//   try {
//     if (useCache) {
//       const cached = translationCache.get(text, targetLang);
//       if (cached) {
//         performance.endTimer(perfId);
//         return cached;
//       }
//     }
    
//     const result = await chrome.runtime.sendMessage({
//       action: 'translate',
//       text,
//       targetLang
//     });
    
//     if (result.success && useCache) {
//       translationCache.set(text, targetLang, result.translation);
//     }
    
//     performance.endTimer(perfId);
//     return result.translation;
    
//   } catch (error) {
//     performance.endTimer(perfId);
//     throw error;
export class TranslationService {
  static instance = null;
  
  static getInstance() {
    if (!TranslationService.instance) {
      TranslationService.instance = new TranslationService();
    }
    return TranslationService.instance;
  }

  constructor() {
    this.API_ENDPOINT = getApiConfig().endpoint;
    this.clientId = crypto.randomUUID();
    const storageKeys = getStorageKeys();
    this.apiKeyStorageKey = storageKeys.API_KEY;
    this.targetLangStorageKey = storageKeys.TARGET_LANGUAGE;
    // Consider if defaultLanguage should come from ui config
    this.defaultTargetLanguage = 'fa'; 
  }

  async translate(text, targetLang = null) {
    const operationId = crypto.randomUUID();
    performance.startTimer(operationId);

    try {
      // Input validation
      if (!text || typeof text !== 'string') {
        throw createError(ErrorTypes.TRANSLATION_ERROR, 'Invalid input text');
      }

      // Rate limiting check
      if (!rateLimiter.isAllowed(this.clientId)) {
        throw createError(ErrorTypes.TRANSLATION_ERROR, 'Too many requests. Please try again later.');
      }

      // Check cache
      const cached = translationCache.get(text, targetLang);
      if (cached) {
        performance.endTimer(operationId);
        return cached;
      }

      // Get API key and target language
      const [apiKey, userPrefLang] = await Promise.all([
        this.getApiKey(),
        this.getTargetLanguage()
      ]);

      const finalTargetLang = targetLang || userPrefLang;

      // Prepare translation request
      const sanitizedText = sanitizeInput(text);
      const response = await this.makeTranslationRequest(sanitizedText, finalTargetLang, apiKey);

      // Process response
      const result = {
        text: response.text,
        isRTL: isRTLLanguage(finalTargetLang)
      };

      // Cache result
      translationCache.set(text, finalTargetLang, result);

      performance.endTimer(operationId);

      return result;

    } catch (error) {
      performance.endTimer(operationId);
      throw error;
    }
  }

  async makeTranslationRequest(text, targetLang, apiKey) {
    return await retry(async () => {
      const response = await fetch(`${this.API_ENDPOINT}?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `[system: You are a translator. Translate exactly as provided to the target language, no extra comments.]\nTranslate the following text to ${targetLang}:\n${text}`
            }]
          }],
          generationConfig: {
            temperature: 0.1,
            topP: 0.8,
            topK: 40,
            maxOutputTokens: 2048
          },
          safetySettings: [
            {
              category: "HARM_CATEGORY_HARASSMENT",
              threshold: "BLOCK_NONE"
            },
            {
              category: "HARM_CATEGORY_HATE_SPEECH",
              threshold: "BLOCK_NONE"
            }
          ]
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw createError(
          ErrorTypes.API_ERROR,
          errorData?.error?.message || 'Translation API error'
        );
      }

      const data = await response.json();
      return {
        text: data.candidates?.[0]?.content?.parts?.[0]?.text || '',
        raw: data
      };
    });
  }

  async getApiKey() {
    const result = await chrome.storage.local.get(this.apiKeyStorageKey);
    const apiKey = result[this.apiKeyStorageKey];

    if (!apiKey || !validateApiKey(apiKey)) {
      throw createError(ErrorTypes.API_KEY_MISSING);
    }

    return apiKey;
  }

  async getTargetLanguage() {
    const result = await chrome.storage.local.get(this.targetLangStorageKey);
    return result[this.targetLangStorageKey] || this.defaultTargetLanguage;
  }
}

export default TranslationService;

// Application configuration management
export class ConfigManager {
  constructor() {
    this.config = {
      api: {
        endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent',
        timeout: 30000,
        retryAttempts: 3,
        retryDelay: 1000,
        rateLimit: {
          maxRequests: 10,
          timeWindow: 60000
        }
      },
      cache: {
        maxSize: 100,
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        enabled: true
      },
      performance: {
        thresholds: {
          translation: 5000,
          apiCall: 3000,
          uiUpdate: 100
        },
        memoryLimit: 100 * 1024 * 1024 // 100MB
      },
      ui: {
        defaultLanguage: 'fa',
        supportedLanguages: ['en', 'fa', 'ar', 'es', 'fr', 'de', 'zh', 'ja', 'ko', 'ru'],
        rtlLanguages: ['fa', 'ar', 'he', 'ur']
      }
    };
  }

  get(path) {
    return path.split('.').reduce((obj, key) => obj?.[key], this.config);
  }

  async loadFromStorage() {
    try {
      const stored = await chrome.storage.local.get('app_config');
      if (stored.app_config) {
        this.config = {
          ...this.config,
          ...JSON.parse(stored.app_config)
        };
      }
    } catch (error) {
      console.error('Failed to load config:', error);
    }
  }

  async saveToStorage() {
    try {
      await chrome.storage.local.set({
        app_config: JSON.stringify(this.config)
      });
    } catch (error) {
      console.error('Failed to save config:', error);
    }
  }

  update(path, value) {
    const keys = path.split('.');
    const lastKey = keys.pop();
    const target = keys.reduce((obj, key) => {
      if (!obj[key]) obj[key] = {};
      return obj[key];
    }, this.config);
    
    target[lastKey] = value;
    this.saveToStorage();
  }

  // Environment-specific configuration
  getEnvironmentConfig() {
    return {
      isDevelopment: process.env.NODE_ENV === 'development',
      isProduction: process.env.NODE_ENV === 'production',
      debugLevel: process.env.DEBUG_LEVEL || 'error',
      version: chrome.runtime.getManifest().version
    };
  }
}

// Create singleton instance
export const configManager = new ConfigManager();

// Initialize config on extension load
chrome.runtime.onInstalled.addListener(() => {
  configManager.loadFromStorage();
});

// Export common configuration getters
export const getApiConfig = () => configManager.get('api');
export const getCacheConfig = () => configManager.get('cache');
export const getPerformanceConfig = () => configManager.get('performance');
export const getUIConfig = () => configManager.get('ui');
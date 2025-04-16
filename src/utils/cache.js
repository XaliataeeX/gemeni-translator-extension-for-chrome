class TranslationCache {
  static CACHE_KEY = 'gemini_translations_cache';
  static MAX_CACHE_SIZE = 100; // Maximum number of cached translations
  static CACHE_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

  static async get(text, targetLang) {
    try {
      const cache = await this.getCache();
      const key = this.getCacheKey(text, targetLang);
      const item = cache[key];

      if (item && !this.isExpired(item.timestamp)) {
        return item.translation;
      }

      return null;
    } catch (error) {
      console.error('Cache retrieval error:', error);
      return null;
    }
  }

  static async set(text, targetLang, translation) {
    try {
      const cache = await this.getCache();
      const key = this.getCacheKey(text, targetLang);

      // Add new translation
      cache[key] = {
        translation,
        timestamp: Date.now()
      };

      // Remove oldest entries if cache is too large
      const keys = Object.keys(cache);
      if (keys.length > this.MAX_CACHE_SIZE) {
        const oldestKey = keys.reduce((a, b) => 
          cache[a].timestamp < cache[b].timestamp ? a : b
        );
        delete cache[oldestKey];
      }

      await chrome.storage.local.set({ [this.CACHE_KEY]: cache });
      return true;
    } catch (error) {
      console.error('Cache save error:', error);
      return false;
    }
  }

  static async clear() {
    try {
      await chrome.storage.local.remove(this.CACHE_KEY);
      return true;
    } catch (error) {
      console.error('Cache clear error:', error);
      return false;
    }
  }

  static getCacheKey(text, targetLang) {
    return `${text.slice(0, 100)}_${targetLang}`;
  }

  static isExpired(timestamp) {
    return Date.now() - timestamp > this.CACHE_EXPIRY;
  }

  static async getCache() {
    const result = await chrome.storage.local.get(this.CACHE_KEY);
    return result[this.CACHE_KEY] || {};
  }

  static async clearExpired() {
    try {
      const cache = await this.getCache();
      let hasExpired = false;

      // Remove expired entries
      Object.keys(cache).forEach(key => {
        if (this.isExpired(cache[key].timestamp)) {
          delete cache[key];
          hasExpired = true;
        }
      });

      if (hasExpired) {
        await chrome.storage.local.set({ [this.CACHE_KEY]: cache });
      }

      return true;
    } catch (error) {
      console.error('Cache cleanup error:', error);
      return false;
    }
  }
}

export default TranslationCache;
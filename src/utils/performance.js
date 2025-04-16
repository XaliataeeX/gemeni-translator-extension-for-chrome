export const debounce = (fn, delay) => {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
};

export const memoize = (fn) => {
  const cache = new Map();
  return (...args) => {
    const key = JSON.stringify(args);
    if (cache.has(key)) return cache.get(key);
    const result = fn(...args);
    cache.set(key, result);
    return result;
  };
};

// Performance monitoring and metrics
class PerformanceMonitor {
  constructor() {
    this.metrics = new Map();
    this.thresholds = {
      translation: 2000, // 2 seconds
      apiCall: 1000,    // 1 second
      rendering: 100    // 100ms
    };
  }

  startOperation(operationId, type) {
    const metric = {
      type,
      startTime: performance.now(),
      measurements: []
    };
    
    this.metrics.set(operationId, metric);
    return operationId;
  }

  measurePoint(operationId, label) {
    const metric = this.metrics.get(operationId);
    if (metric) {
      metric.measurements.push({
        label,
        timestamp: performance.now()
      });
    }
  }

  endOperation(operationId) {
    const metric = this.metrics.get(operationId);
    if (!metric) return null;

    const endTime = performance.now();
    const duration = endTime - metric.startTime;

    const result = {
      type: metric.type,
      duration,
      measurements: metric.measurements.map(m => ({
        label: m.label,
        timing: m.timestamp - metric.startTime
      })),
      timestamp: Date.now()
    };

    this.metrics.delete(operationId);
    this.checkPerformance(result);
    
    return result;
  }

  checkPerformance(metric) {
    const threshold = this.thresholds[metric.type];
    if (threshold && metric.duration > threshold) {
      console.warn(`Performance warning: ${metric.type} operation took ${metric.duration.toFixed(2)}ms`);
      this.reportSlowOperation(metric);
    }
  }

  reportSlowOperation(metric) {
    const report = {
      type: metric.type,
      duration: metric.duration,
      timestamp: metric.timestamp,
      measurements: metric.measurements,
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    // Log performance issues
    console.debug('Performance report:', report);
  }

  getMetrics(type = null) {
    const metrics = Array.from(this.metrics.values());
    return type ? metrics.filter(m => m.type === type) : metrics;
  }

  getAverageTime(type) {
    const metrics = this.getMetrics(type);
    if (!metrics.length) return 0;
    
    const total = metrics.reduce((sum, m) => sum + m.duration, 0);
    return total / metrics.length;
  }

  clearMetrics() {
    this.metrics.clear();
  }
}

// Memory monitoring
class MemoryMonitor {
  constructor() {
    this.memoryUsage = [];
    this.maxSamples = 50;
    this.warningThreshold = 0.8; // 80% of heap limit
  }

  recordMemoryUsage() {
    if (!performance.memory) return;

    const usage = {
      timestamp: Date.now(),
      totalJSHeapSize: performance.memory.totalJSHeapSize,
      usedJSHeapSize: performance.memory.usedJSHeapSize,
      jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
    };

    this.memoryUsage.push(usage);
    
    if (this.memoryUsage.length > this.maxSamples) {
      this.memoryUsage.shift();
    }

    this.checkMemoryLeak();
  }

  checkMemoryLeak() {
    if (this.memoryUsage.length < 2) return;

    const latest = this.memoryUsage[this.memoryUsage.length - 1];
    const heapUsageRatio = latest.usedJSHeapSize / latest.jsHeapSizeLimit;

    if (heapUsageRatio > this.warningThreshold) {
      console.warn('Memory usage warning: High heap usage detected');
      this.cleanupMemory();
    }
  }

  cleanupMemory() {
    // Clear old cached data
    TranslationCache.clearExpired();
    
    // Clear old metrics
    this.memoryUsage = this.memoryUsage.slice(-10);
  }

  getMemoryStats() {
    if (!this.memoryUsage.length) return null;

    const latest = this.memoryUsage[this.memoryUsage.length - 1];
    return {
      usedHeap: (latest.usedJSHeapSize / 1024 / 1024).toFixed(2) + ' MB',
      totalHeap: (latest.totalJSHeapSize / 1024 / 1024).toFixed(2) + ' MB',
      heapLimit: (latest.jsHeapSizeLimit / 1024 / 1024).toFixed(2) + ' MB',
      usageRatio: ((latest.usedJSHeapSize / latest.jsHeapSizeLimit) * 100).toFixed(1) + '%'
    };
  }
}

// Cache management
class TranslationCache {
  constructor(maxSize = 100) {
    this.cache = new Map();
    this.maxSize = maxSize;
  }

  get(key) {
    return this.cache.get(key);
  }

  set(key, value) {
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(key, {
      value,
      timestamp: Date.now()
    });
  }

  clear(maxAge = 3600000) { // Default: 1 hour
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > maxAge) {
        this.cache.delete(key);
      }
    }
  }

  static clearExpired() {
    // Placeholder for clearing expired cache entries
  }
}

export { PerformanceMonitor, MemoryMonitor };

// Create singleton instances
export const performanceMonitor = new PerformanceMonitor();
export const memoryMonitor = new MemoryMonitor();
export const translationCache = new TranslationCache();

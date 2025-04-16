// Translation related types
export interface TranslationResult {
  text: string;
  isRTL: boolean;
  raw?: any;
}

export interface TranslationOptions {
  targetLang?: string;
  sourceText: string;
  useCache?: boolean;
}

export interface TranslationError {
  type: ErrorType;
  message: string;
  originalError?: any;
  timestamp: string;
}

// Error types
export type ErrorType = 
  | 'API_KEY_MISSING'
  | 'API_ERROR'
  | 'NETWORK_ERROR'
  | 'TIMEOUT_ERROR'
  | 'TRANSLATION_ERROR';

// Language related types
export interface Language {
  name: string;
  nativeName: string;
  isRTL: boolean;
}

export interface LanguageMap {
  [key: string]: Language;
}

// Settings and configuration
export interface AppSettings {
  translationDirection: 'to_persian' | 'to_english';
  targetLanguage: string;
  theme?: 'light' | 'dark';
}

export interface APIConfig {
  endpoint: string;
  retryAttempts: number;
  retryDelay: number;
  timeout: number;
}

// Performance monitoring
export interface PerformanceMetric {
  startTime: number;
  endTime: number | null;
  duration: number | null;
}

export interface PerformanceThresholds {
  translation: number;
  apiCall: number;
  uiUpdate: number;
}

// Loading states
export interface LoadingState {
  startTime: number;
  elementId: string | null;
}

// Cache related types
export interface CacheEntry<T> {
  value: T;
  timestamp: number;
}

export interface CacheOptions {
  maxSize?: number;
  maxAge?: number;
}

// Message types for communication between components
export type MessageAction = 
  | 'translate'
  | 'translateSelection'
  | 'showError'
  | 'ping';

export interface Message {
  action: MessageAction;
  text?: string;
  targetLang?: string;
  translatedText?: string;
  isRTL?: boolean;
  error?: string;
}

// Chrome storage keys
export type StorageKey = 
  | 'gemini_api_key'
  | 'target_language'
  | 'app_settings';

// Security related types
export interface RateLimitConfig {
  maxRequests: number;
  timeWindow: number; // in milliseconds
}

export interface CSPDirectives {
  'default-src': string[];
  'script-src': string[];
  'style-src': string[];
  'img-src': string[];
  'connect-src': string[];
  'font-src': string[];
  'object-src': string[];
  'base-uri': string[];
  'form-action': string[];
  'frame-ancestors': string[];
  'upgrade-insecure-requests'?: string[];
}

// DOM element references
export interface DOMElements {
  translateBtn: HTMLButtonElement | null;
  settingsBtn: HTMLButtonElement | null;
  settingsPanel: HTMLDivElement | null;
  closeSettings: HTMLButtonElement | null;
  statusContainer: HTMLDivElement | null;
  apiKeyInput: HTMLInputElement | null;
  saveApiKeyBtn: HTMLButtonElement | null;
  targetLanguageSelect: HTMLSelectElement | null;
  swapDirectionBtn: HTMLButtonElement | null;
  directionLabel: HTMLDivElement | null;
}

import { TranslationService } from '../src/services/translation';
import { languages, isRTLLanguage, getLanguageName, getLanguageDirection } from '../src/utils/languages';
import { ErrorTypes, formatError, createError } from '../src/utils/error-handler';

describe('TranslationService', () => {
  let service;

  beforeEach(() => {
    service = TranslationService.getInstance();
  });

  test('should translate text correctly', async () => {
    const result = await service.translate('Hello');
    expect(result.text).toBe('سلام');
  });

  test('should handle API errors', async () => {
    // Mock API error
    // Test error handling
  });
});

describe('Language Utilities', () => {
  test('should correctly identify RTL languages', () => {
    expect(isRTLLanguage('fa')).toBe(true);
    expect(isRTLLanguage('ar')).toBe(true);
    expect(isRTLLanguage('en')).toBe(false);
    expect(isRTLLanguage('unknown')).toBe(false);
  });

  test('should return correct language names', () => {
    expect(getLanguageName('fa', true)).toBe('فارسی');
    expect(getLanguageName('fa', false)).toBe('Persian');
    expect(getLanguageName('en', true)).toBe('English');
    expect(getLanguageName('unknown')).toBe('unknown');
  });

  test('should return correct language direction', () => {
    expect(getLanguageDirection('fa')).toBe('rtl');
    expect(getLanguageDirection('en')).toBe('ltr');
    expect(getLanguageDirection('unknown')).toBe('ltr');
  });
});

describe('Error Handling', () => {
  test('should format errors correctly', () => {
    const apiKeyError = createError(ErrorTypes.API_KEY_MISSING);
    expect(formatError(apiKeyError)).toContain('API key is missing');

    const networkError = createError(ErrorTypes.NETWORK_ERROR);
    expect(formatError(networkError)).toContain('Network connection error');

    expect(formatError('Custom error')).toBe('Custom error');
    expect(formatError({})).toBe('An unexpected error occurred');
  });

  test('should create error objects with correct structure', () => {
    const error = createError(ErrorTypes.API_ERROR, new Error('Test error'));
    expect(error).toHaveProperty('type', ErrorTypes.API_ERROR);
    expect(error).toHaveProperty('message');
    expect(error).toHaveProperty('timestamp');
    expect(error).toHaveProperty('originalError');
  });
});

// Mock chrome.storage for testing
const mockStorage = {
  local: {
    get: jest.fn(),
    set: jest.fn()
  }
};

global.chrome = {
  storage: mockStorage
};

describe('Chrome Extension Storage', () => {
  beforeEach(() => {
    mockStorage.local.get.mockClear();
    mockStorage.local.set.mockClear();
  });

  test('should handle API key storage', async () => {
    const testApiKey = 'test-api-key';
    mockStorage.local.set.mockResolvedValueOnce(undefined);
    mockStorage.local.get.mockResolvedValueOnce({ gemini_api_key: testApiKey });

    await chrome.storage.local.set({ gemini_api_key: testApiKey });
    expect(mockStorage.local.set).toHaveBeenCalledWith({ gemini_api_key: testApiKey });

    const result = await chrome.storage.local.get('gemini_api_key');
    expect(result.gemini_api_key).toBe(testApiKey);
  });

  test('should handle target language storage', async () => {
    const testLang = 'fa';
    mockStorage.local.set.mockResolvedValueOnce(undefined);
    mockStorage.local.get.mockResolvedValueOnce({ target_language: testLang });

    await chrome.storage.local.set({ target_language: testLang });
    expect(mockStorage.local.set).toHaveBeenCalledWith({ target_language: testLang });

    const result = await chrome.storage.local.get('target_language');
    expect(result.target_language).toBe(testLang);
  });
});

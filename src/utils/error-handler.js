// src/utils/error-handler.js

/**
 * Defines standardized error types for the application.
 */
export const ErrorTypes = {
  API_ERROR: 'API_ERROR', // Generic API error
  NETWORK_ERROR: 'NETWORK_ERROR', // Network connectivity issues
  API_KEY_MISSING: 'API_KEY_MISSING', // API key is not set or invalid
  TIMEOUT_ERROR: 'TIMEOUT_ERROR', // Request timed out
  VALIDATION_ERROR: 'VALIDATION_ERROR', // Input validation failed
  TRANSLATION_SERVICE_ERROR: 'TRANSLATION_SERVICE_ERROR', // Errors specific to TranslationService logic
  UNKNOWN_ERROR: 'UNKNOWN_ERROR', // Default for errors not otherwise categorized
};

/**
 * Creates a structured error object.
 * @param {string} type - One of the ErrorTypes.
 * @param {Error} [originalError=null] - The original error object, if any.
 * @param {string} [messageOverride=null] - A custom message to override the original error's message.
 * @returns {object} A structured error object.
 */
export function createError(type, originalError = null, messageOverride = null) {
  // Ensure type is a valid ErrorTypes key, default to UNKNOWN_ERROR if not
  const errorType = Object.values(ErrorTypes).includes(type) ? type : ErrorTypes.UNKNOWN_ERROR;
  
  let message = messageOverride;
  if (!message) {
    if (originalError && originalError.message) {
      message = originalError.message;
    } else {
      // Provide a default message based on type if no other message is available
      switch (errorType) {
        case ErrorTypes.API_KEY_MISSING:
          message = 'API key is missing or invalid.';
          break;
        case ErrorTypes.NETWORK_ERROR:
          message = 'A network error occurred. Please check your connection.';
          break;
        case ErrorTypes.TIMEOUT_ERROR:
          message = 'The operation timed out.';
          break;
        default:
          message = 'An unknown error occurred.';
      }
    }
  }

  return {
    type: errorType,
    message: message,
    originalError: originalError,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Formats a structured error object into a user-friendly string.
 * @param {object} errorObject - The structured error object created by createError.
 * @returns {string} A user-friendly error message.
 */
export function formatUserFriendlyMessage(errorObject) {
  if (!errorObject || !errorObject.type) {
    return 'An unexpected error occurred. Please try again.';
  }

  switch (errorObject.type) {
    case ErrorTypes.API_ERROR:
      return 'There was a problem communicating with the translation service. Please try again later.';
    case ErrorTypes.NETWORK_ERROR:
      return 'Network connection issue. Please check your internet connection and try again.';
    case ErrorTypes.API_KEY_MISSING:
      return 'Your API key is missing or invalid. Please check your settings.';
    case ErrorTypes.TIMEOUT_ERROR:
      return 'The translation request timed out. Please try again.';
    case ErrorTypes.VALIDATION_ERROR:
      return `Invalid input: ${errorObject.message}`;
    case ErrorTypes.TRANSLATION_SERVICE_ERROR:
      return `Translation service error: ${errorObject.message}`;
    case ErrorTypes.UNKNOWN_ERROR:
    default:
      return errorObject.message || 'An unknown error occurred. Please try again.';
  }
}

/**
 * Retries a function multiple times with a delay.
 * @param {Function} fn - The asynchronous function to retry.
 * @param {number} [attempts=3] - The maximum number of attempts.
 * @param {number} [delay=1000] - The delay between attempts in milliseconds.
 * @returns {Promise<any>} A promise that resolves with the result of the function or rejects after all attempts.
 */
export async function retry(fn, attempts = 3, delay = 1000) {
  let lastError;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (i < attempts - 1) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  throw lastError;
}

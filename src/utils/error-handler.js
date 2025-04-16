// Advanced error handling with user-friendly messages
class ErrorHandler {
  static errorTypes = {
    API_ERROR: 'api_error',
    NETWORK_ERROR: 'network_error',
    TRANSLATION_ERROR: 'translation_error',
    PERMISSION_ERROR: 'permission_error',
    VALIDATION_ERROR: 'validation_error'
  };

  static async handleError(error, context = '') {
    console.error(`[Translator Error] ${context}:`, error);

    const errorType = this.getErrorType(error);
    const userMessage = this.getUserFriendlyMessage(errorType, error);

    try {
      // Send error to popup if active
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.id) {
        await chrome.tabs.sendMessage(tab.id, {
          action: 'error',
          error: userMessage,
          context
        });
      }

      // Log error metrics
      this.logErrorMetrics(errorType, error, context);

    } catch (e) {
      console.error('Error in error handler:', e);
    }

    return {
      type: errorType,
      message: userMessage,
      originalError: error
    };
  }

  static getErrorType(error) {
    if (error.name === 'AbortError' || error.name === 'TimeoutError') {
      return this.errorTypes.NETWORK_ERROR;
    }
    if (error.message?.includes('API')) {
      return this.errorTypes.API_ERROR;
    }
    if (error.message?.includes('permission')) {
      return this.errorTypes.PERMISSION_ERROR;
    }
    if (error.message?.includes('translation')) {
      return this.errorTypes.TRANSLATION_ERROR;
    }
    return this.errorTypes.VALIDATION_ERROR;
  }

  static getUserFriendlyMessage(errorType, error) {
    const messages = {
      [this.errorTypes.API_ERROR]: 'خطا در ارتباط با سرور. لطفاً کلید API خود را بررسی کنید.',
      [this.errorTypes.NETWORK_ERROR]: 'خطا در اتصال به اینترنت. لطفاً اتصال خود را بررسی کنید.',
      [this.errorTypes.TRANSLATION_ERROR]: 'خطا در ترجمه متن. لطفاً دوباره تلاش کنید.',
      [this.errorTypes.PERMISSION_ERROR]: 'دسترسی لازم وجود ندارد. لطفاً مجوزهای افزونه را بررسی کنید.',
      [this.errorTypes.VALIDATION_ERROR]: 'داده‌های نامعتبر. لطفاً ورودی‌ها را بررسی کنید.'
    };

    return messages[errorType] || error.message || 'خطای ناشناخته رخ داده است.';
  }

  static logErrorMetrics(type, error, context) {
    // Can be extended to send error metrics to an analytics service
    const errorLog = {
      type,
      message: error.message,
      context,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent
    };

    console.debug('Error metrics:', errorLog);
  }
}

export default ErrorHandler;

import TranslationService from './src/services/translation.js';
import { getStorageKeys } from './src/utils/config.js';
import { formatUserFriendlyMessage, createError, ErrorTypes } from './src/utils/error-handler.js';
import { isRTLLanguage as utilIsRTLLanguage, getLanguageName as utilGetLanguageName } from './src/utils/languages.js';
// Note: ErrorHandler from error-broadcaster.js is not directly used, adapting its logic instead.

const translationService = TranslationService.getInstance();
const storageKeys = getStorageKeys();

async function handleAndBroadcastError(error, context) {
  console.error(`[${context}] Raw Error:`, error);

  let userFriendlyMessage;
  if (error && error.type && error.message) { // Check if it's a structured error
    userFriendlyMessage = formatUserFriendlyMessage(error);
  } else {
    const structuredError = createError(ErrorTypes.UNKNOWN_ERROR, error, error?.message);
    userFriendlyMessage = formatUserFriendlyMessage(structuredError);
  }
  
  console.error(`[${context}] User-friendly message:`, userFriendlyMessage);

  // Broadcasting logic (adapted from old handleError and sendErrorToPopup)
  const sendErrorToUi = async (targetTabId = null) => {
    if (targetTabId) {
      try {
        // Check if content script is loaded before sending message
        await new Promise((resolve, reject) => {
          chrome.tabs.sendMessage(targetTabId, { action: 'ping' }, response => {
            if (chrome.runtime.lastError) {
              console.log('Content script not ready in target tab:', chrome.runtime.lastError.message);
              reject(new Error(chrome.runtime.lastError.message)); // Propagate error to try popup
              return;
            }
            if (response && response.status === 'ok'){
               chrome.tabs.sendMessage(targetTabId, {
                action: 'error', // Or 'showError' as used in contextMenus
                error: userFriendlyMessage,
                context
              }, response => {
                if (chrome.runtime.lastError) {
                  console.log('Error sending message to content script:', chrome.runtime.lastError.message);
                  // Potentially try popup as fallback if this specific send fails
                }
              });
              resolve();
            } else {
               reject(new Error('Ping failed or no response'));
            }
          });
        });
      } catch (e) {
        // If sending to tab fails, try sending to popup
        sendErrorToPopupOnly();
      }
    } else {
      sendErrorToPopupOnly();
    }
  };

  const sendErrorToPopupOnly = () => {
    try {
      chrome.runtime.sendMessage({
        action: 'error',
        error: userFriendlyMessage,
        context
      }, response => {
        if (chrome.runtime.lastError) {
          console.log('No active popup connection available for error broadcast:', chrome.runtime.lastError.message);
        }
      });
    } catch (e) {
      console.log('Error sending message to popup for error broadcast:', e);
    }
  };

  // Try to send to active tab first, then fallback to popup
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      sendErrorToUi(tab.id);
    } else {
      sendErrorToPopupOnly();
    }
  } catch (e) {
    console.error('Error in handleAndBroadcastError process:', e);
    sendErrorToPopupOnly(); // Fallback
  }
}


// Function to inject content scripts into a tab
async function injectContentScripts(tabId) {
  try {
    console.log(`Injecting content script into tab ${tabId}...`);
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['content.js']
    });
    await chrome.scripting.insertCSS({
      target: { tabId },
      files: ['content-styles.css']
    });
    console.log(`Content script injection successful for tab ${tabId}`);
  } catch (err) {
    console.error(`Content script injection failed for tab ${tabId}:`, err);
    // Rethrow the error if you want ensureContentScriptLoaded to handle it
    // or manage specific UI feedback from here if needed.
    throw err; 
  }
}

// Ensures content script is loaded in a tab, injecting it if necessary.
async function ensureContentScriptLoaded(tabId) {
  return new Promise(async (resolve) => { // Made the promise callback async
    // First check if content script is already loaded
    try {
      const response = await new Promise((pingResolve, pingReject) => {
        chrome.tabs.sendMessage(tabId, { action: 'ping' }, (res) => {
          if (chrome.runtime.lastError) {
            pingReject(new Error(chrome.runtime.lastError.message));
          } else {
            pingResolve(res);
          }
        });
      });

      if (response && response.status === 'ok') {
        console.log(`Content script already loaded in tab ${tabId}`);
        resolve(true);
        return;
      }
    } catch (e) {
      console.log(`Content script not loaded in tab ${tabId} (or ping failed), attempting to inject:`, e.message);
      // Content script not loaded, or another issue with pinging, proceed to inject.
    }
    
    try {
      await injectContentScripts(tabId);
    } catch (injectionError) {
       // Initial injection failed, don't start polling, resolve false.
      console.error(`Initial injection failed for tab ${tabId}, not starting poller.`, injectionError);
      resolve(false);
      return;
    }
    
    // Set up interval to check if content script is loaded after initial injection attempt
    let attempts = 0;
    const maxAttempts = 10; // Max 5 seconds (10 attempts * 500ms)
    const checkInterval = setInterval(async () => {
      attempts++;
      try {
        const response = await new Promise((pingResolve, pingReject) => {
          chrome.tabs.sendMessage(tabId, { action: 'ping' }, (res) => {
            if (chrome.runtime.lastError) {
              pingReject(new Error(chrome.runtime.lastError.message));
            } else {
              pingResolve(res);
            }
          });
        });

        if (response && response.status === 'ok') {
          console.log(`Content script loaded successfully in tab ${tabId} after ${attempts} attempts.`);
          clearInterval(checkInterval);
          resolve(true);
        } else if (attempts >= maxAttempts) {
          console.error(`Content script loading timed out for tab ${tabId} after ${attempts} attempts.`);
          clearInterval(checkInterval);
          resolve(false);
        }
      } catch (e) {
        console.log(`Content script still not loaded in tab ${tabId} (attempt ${attempts}), retrying injection...`, e.message);
        if (attempts < maxAttempts) {
          try {
            await injectContentScripts(tabId); // Try to inject again
          } catch (retryInjectionError) {
            console.error(`Retry injection failed for tab ${tabId}, attempt ${attempts}.`, retryInjectionError);
            // Continue polling, maybe it will connect eventually or other instance injected.
          }
        } else {
           console.error(`Content script loading timed out for tab ${tabId} after ${attempts} attempts (last try was injection).`);
           clearInterval(checkInterval);
           resolve(false);
        }
      }
    }, 500);
  });
}

// اضافه کردن تابع تشخیص زبان
function detectLanguage(text) {
  return new Promise((resolve) => {
    chrome.i18n.detectLanguage(text, (result) => {
      if (result.languages.length > 0) {
        resolve(result.languages[0].language);
      } else {
        resolve('en'); // Default to English if detection fails
      }
    });
  });
}

// اضافه کردن متغیر برای زبان پیش‌فرض
let userPrefLang = 'fa'; // پیش‌فرض فارسی

// تابع جدید برای دریافت زبان مقصد
async function getTargetLanguage() {
  try {
    const result = await chrome.storage.local.get(storageKeys.TARGET_LANGUAGE);
    return result[storageKeys.TARGET_LANGUAGE] || userPrefLang;
  } catch (error) {
    console.error('Error getting target language:', error);
    return userPrefLang;
  }
}

// تشخیص خودکار موضوع متن
async function detectTextContext(text) {
  // الگوهای ساده برای تشخیص موضوع متن
  const patterns = {
    tech: /\b(computer|software|hardware|programming|code|algorithm|database|server|network|API|app|application|website|internet|cyber|digital|technology|IT|AI|ML|data science)\b/i,
    medical: /\b(health|medical|doctor|patient|disease|treatment|medicine|hospital|clinic|symptom|diagnosis|therapy|surgery|physician|nurse|healthcare)\b/i,
    design: /\b(design|graphic|UI|UX|user interface|user experience|layout|typography|color|font|logo|brand|creative|artistic|aesthetic|visual)\b/i,
    business: /\b(business|company|corporate|market|finance|economy|investment|stock|profit|loss|revenue|sales|marketing|management|strategy|entrepreneur)\b/i,
    science: /\b(science|scientific|research|experiment|theory|hypothesis|physics|chemistry|biology|mathematics|equation|formula|laboratory|academic)\b/i,
    legal: /\b(legal|law|attorney|lawyer|court|judge|justice|rights|contract|agreement|regulation|compliance|lawsuit|plaintiff|defendant|legislation)\b/i,
    literature: /\b(literature|book|novel|poem|poetry|author|writer|character|plot|narrative|fiction|non-fiction|literary|prose|verse|chapter)\b/i,
    humor: /\b(humor|funny|joke|comedy|laugh|amusing|hilarious|satire|parody|irony|sarcasm|witty|punchline|comical|entertaining)\b/i
  };
  
  // بررسی الگوها
  for (let [context, pattern] of Object.entries(patterns)) {
    if (pattern.test(text)) {
      return `Consider this is a ${context} text. `;
    }
  }
  
  return ''; // اگر موضوع خاصی تشخیص داده نشد
}

// دریافت تنظیمات موضوع ترجمه
async function getTranslationMode() {
  try {
    const result = await chrome.storage.local.get(storageKeys.TRANSLATION_MODE);
    return result[storageKeys.TRANSLATION_MODE] || null;
  } catch (error) {
    console.error('Error getting translation mode:', error);
    return null;
  }
}

// ذخیره در تاریخچه
async function addToHistory(original, translated) {
  try {
    const historyResult = await chrome.storage.local.get(storageKeys.HISTORY);
    const translationHistory = historyResult[storageKeys.HISTORY] || [];
    
    // اضافه کردن به ابتدای آرایه
    translationHistory.unshift({
      original,
      translated,
      timestamp: Date.now()
    });
    
    // محدود کردن تعداد موارد تاریخچه به 50
    if (translationHistory.length > 50) {
      translationHistory.length = 50;
    }
    
    await chrome.storage.local.set({ [storageKeys.HISTORY]: translationHistory });
    
    // ارسال پیام به پاپ‌آپ برای به‌روزرسانی تاریخچه
    try {
      chrome.runtime.sendMessage({ action: 'updateHistory' }, response => {
        if (chrome.runtime.lastError) {
          console.log('No active popup connection for history update');
        }
      });
    } catch (e) {
      console.log('Error sending history update message:', e);
    }
    
  } catch (error) {
    console.error('Error adding to history:', error);
  }
}

// ایجاد منوی راست کلیک در زمان نصب
chrome.runtime.onInstalled.addListener(() => {
  try {
    chrome.contextMenus.removeAll(() => {
      chrome.contextMenus.create({
        id: 'translateText',
        title: 'ترجمه متن انتخاب شده',
        contexts: ['selection']
      });
      
      chrome.contextMenus.create({
        id: 'translatePage',
        title: 'ترجمه صفحه',
        contexts: ['page']
      });
    });
  } catch (error) {
    console.error('Error creating context menu:', error);
  }
});

// بازنویسی تابع مدیریت context menu
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (!tab?.id) return;
  
  try {
    // مطمئن شویم content script لود شده
    const isLoaded = await ensureContentScriptLoaded(tab.id);
    if (!isLoaded) {
      console.error('Content script could not be loaded');
      // Try to inject the script one more time directly
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['content.js']
        });
        await chrome.scripting.insertCSS({
          target: { tabId: tab.id },
          files: ['content-styles.css']
        });
      } catch (injectionError) {
        console.error('Failed to inject content script:', injectionError);
        throw new Error('خطا در بارگذاری اسکریپت');
      }
    }
    
    if (info.menuItemId === 'translateText') {
      const text = info.selectionText?.trim();
      if (!text) {
        throw new Error('No text selected for translation');
      }
      
      // Use TranslationService for context menu translation
      const translationResult = await translationService.translate(text);
      if (!translationResult || !translationResult.text) {
        throw new Error('Translation failed');
      }
      
      try {
        await chrome.tabs.sendMessage(tab.id, {
          action: 'translateSelection',
          translatedText: translationResult.text,
          isRTL: utilIsRTLLanguage(translationResult.targetLang || userPrefLang) // Updated call
        });
      } catch (err) {
        console.error('Error sending translation to content script:', err);
        throw new Error('خطا در نمایش ترجمه');
      }
    } 
    else if (info.menuItemId === 'translatePage') {
      try {
        await chrome.tabs.sendMessage(tab.id, {
          action: 'translatePage'
        });
      } catch (err) {
        // If sending 'translatePage' fails, it's an operational error.
        // Create a structured error to pass to handleAndBroadcastError.
        const structuredError = createError(ErrorTypes.UNKNOWN_ERROR, err, 'Failed to send translatePage request to content script.');
        await handleAndBroadcastError(structuredError, 'Context menu - translatePage send');
        // No need to throw further, error is handled.
      }
    }
  } catch (error) { // Catches errors from translateText logic or ensureContentScriptLoaded
    await handleAndBroadcastError(error, 'Context menu action');
    
    // The showError logic below is now part of handleAndBroadcastError's responsibility
    // So, this specific block can be removed or simplified if handleAndBroadcastError
    // already does exactly this. For now, let's assume handleAndBroadcastError covers it.
    // نمایش خطا به کاربر از طریق content script
    /*
    try {
      // Check if tab still exists before sending message
      const tabExists = await chrome.tabs.get(tab.id).catch(() => null);
      if (!tabExists) {
        console.log('Tab no longer exists, cannot show error');
        return;
      }
      
      // Check if content script is loaded before sending message
      const isContentScriptLoaded = await new Promise(resolve => {
        chrome.tabs.sendMessage(tab.id, { action: 'ping' }, response => {
          if (chrome.runtime.lastError) {
            console.log('Content script not ready:', chrome.runtime.lastError.message);
            resolve(false);
            return;
          }
          resolve(response && response.status === 'ok');
        });
      });
      
      if (isContentScriptLoaded) {
        chrome.tabs.sendMessage(tab.id, {
          action: 'showError',
          error: error.message
        }, response => {
          if (chrome.runtime.lastError) {
            console.log('Error showing error to user:', chrome.runtime.lastError.message);
          }
        });
      } else {
        console.log('Content script not loaded, cannot show error');
      }
    } catch (e) {
      console.error('Failed to show error to user:', e);
    }
    */
  }
});

// مدیریت پیام‌ها با تایم‌اوت و بررسی خطا 
// This listener handles messages from popup and content scripts.
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || !message.action) {
    console.error('Invalid message received');
    return false;
  }
  
  console.log('Received message:', message.action);
  
  // پاسخ به پینگ برای تشخیص آماده بودن اسکریپت
  if (message.action === 'ping') {
    sendResponse({ status: 'ok' });
    return true;
  }
  
  if (message.action === 'translate') {
    // استفاده از Promise.race برای تعیین مهلت زمانی
    const translationPromise = translationService.translate(message.text, message.targetLang || message.forceDirection);
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('عملیات ترجمه با تایم‌اوت مواجه شد')), 30000);
    });
    
    Promise.race([translationPromise, timeoutPromise])
      .then(translation => {
        try {
          // Use a safer way to check if we can still send a response
          if (chrome.runtime.id) { // Check if extension is still running
            sendResponse({ 
              success: true, 
              translatedText: translation.text,
              // Assuming translation object from service now includes targetLang
              isRTL: utilIsRTLLanguage(translation.targetLang || message.targetLang || userPrefLang) // Updated call
            });
          }
        } catch (e) {
          console.log('Channel closed before response could be sent:', e);
        }
      })
      .catch(error => { // This error is from translationService.translate or the timeout
        handleAndBroadcastError(error, 'Translate action');
        try {
          // Use a safer way to check if we can still send a response
          if (chrome.runtime.id) { // Check if extension is still running
            // Send the formatted user-friendly message to the caller (e.g., popup)
            const userFriendlyMessage = (error.type && error.message) ? formatUserFriendlyMessage(error) : formatUserFriendlyMessage(createError(ErrorTypes.UNKNOWN_ERROR, error, error?.message));
            sendResponse({ success: false, error: userFriendlyMessage });
          }
        } catch (e) {
          console.log('Channel closed before error could be sent:', e);
        }
      });

    return true; // Will respond asynchronously
  }
  
  // Note: translateBatch logic was removed in a previous refactoring,
  // calls to translationService.translate are made individually.
  // If translateBatch messages are still expected, this part needs adjustment.
  // For now, assuming individual 'translate' calls cover batch needs from UI.
  if (message.action === 'translateBatch') {
    const translations = [];
    const promises = message.texts.map(text => 
      translationService.translate(text, message.targetLang || message.forceDirection)
        .then(result => translations.push(result.text))
        .catch(error => { // Error for an individual translation in batch
          handleAndBroadcastError(error, 'TranslateBatch action - individual translation');
          translations.push(text); // Push original text in case of error
        })
    );

    Promise.all(promises)
      .then(() => {
        try {
          // Use a safer way to check if we can still send a response
          if (chrome.runtime.id) { // Check if extension is still running
            sendResponse({ success: true, translations });
          }
        } catch (error) { // Error sending the successful response
          console.log('Channel closed, ignoring response for successful batch translation:', error);
        }
      })
      .catch(error => { // This catch is for Promise.all itself, if something unexpected happens with it
        handleAndBroadcastError(error, 'TranslateBatch action - Promise.all');
        try {
          // Use a safer way to check if we can still send a response
          if (chrome.runtime.id) { // Check if extension is still running
            const userFriendlyMessage = (error.type && error.message) ? formatUserFriendlyMessage(error) : formatUserFriendlyMessage(createError(ErrorTypes.UNKNOWN_ERROR, error, error?.message));
            sendResponse({ success: false, error: userFriendlyMessage, translations: message.texts }); // send original texts back
          }
        } catch (e) {
          console.log('Channel closed before batch error could be sent:', e);
        }
      });

    return true; // Will respond asynchronously
  }

  return false; // Will not respond
});

// اضافه کردن event listener برای خطاهای uncaught
// Note: onInstalled listener was duplicated, removing one instance.
// chrome.runtime.onInstalled.addListener(() => {
//   console.log('Extension installed/updated');
// });
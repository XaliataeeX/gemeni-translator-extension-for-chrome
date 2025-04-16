const CONFIG = {
  API_ENDPOINT: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent',
  STORAGE_KEYS: {
    API_KEY: 'gemini_api_key',
    SETTINGS: 'app_settings',
  }
};

// بهبود مدیریت خطاها
async function handleError(error, context) {
  console.error(`[Translator Error] ${context}:`, error);
  
  // ارسال خطا به پاپ‌آپ
  try {
    // First try to send to active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      // Check if content script is loaded before sending message
      chrome.tabs.sendMessage(tab.id, { action: 'ping' }, response => {
        if (chrome.runtime.lastError) {
          console.log('Content script not ready in active tab:', chrome.runtime.lastError.message);
          // Try to send to popup instead
          sendErrorToPopup();
          return;
        }
        
        // Content script is loaded, send error message
        chrome.tabs.sendMessage(tab.id, {
          action: 'error',
          error: error.message,
          context
        }, response => {
          if (chrome.runtime.lastError) {
            console.log('Error sending message to content script:', chrome.runtime.lastError.message);
            // Try to send to popup instead
            sendErrorToPopup();
          }
        });
      });
    } else {
      // No active tab, try to send to popup
      sendErrorToPopup();
    }
  } catch (e) {
    console.error('Error in error handling process:', e);
    // Try to send to popup as fallback
    sendErrorToPopup();
  }
  
  // Helper function to send error to popup
  function sendErrorToPopup() {
    try {
      chrome.runtime.sendMessage({
        action: 'error',
        error: error?.message || 'Unknown error',
        context
      }, response => {
        if (chrome.runtime.lastError) {
          console.log('No active popup connection available:', chrome.runtime.lastError.message);
        }
      });
    } catch (e) {
      console.log('Error sending message to popup:', e);
    }
  }
}

// اضافه کردن سیستم لاگینگ
function logError(error, context = '') {
  console.error(`[Translator Error] ${context}:`, error);
  // ارسال خطا به پنجره پاپ‌آپ
  try {
    chrome.runtime.sendMessage({
      action: 'error',
      error: error?.message || 'Unknown error',
      context
    }, response => {
      if (chrome.runtime.lastError) {
        // Silently catch connection errors
        console.log('No active popup connection available:', chrome.runtime.lastError);
      }
    });
  } catch (e) {
    console.log('Error sending message to popup:', e);
  }
}

// دریافت API key از storage
async function getApiKey() {
  const result = await chrome.storage.local.get(CONFIG.STORAGE_KEYS.API_KEY);
  return result[CONFIG.STORAGE_KEYS.API_KEY];
}

// بهبود تابع بررسی API key
async function checkAPIKey() {
  const apiKey = await getApiKey();
  
  if (!apiKey) {
    // باز کردن صفحه تنظیمات در صورت نبود API key
    await chrome.tabs.create({ url: 'options.html' });
    throw new Error('Please enter your API key in settings');
  }
  
  return apiKey;
}

// اضافه کردن این تابع جدید در بالای فایل
async function ensureContentScriptLoaded(tabId) {
  return new Promise((resolve) => {
    // First check if content script is already loaded
    chrome.tabs.sendMessage(tabId, { action: 'ping' }, response => {
      if (chrome.runtime.lastError) {
        console.log('Content script not loaded, attempting to inject:', chrome.runtime.lastError.message);
        // Content script not loaded, inject it
        injectContentScript();
      } else if (response && response.status === 'ok') {
        console.log('Content script already loaded');
        resolve(true);
        return;
      }
    });
    
    // Function to inject content script
    const injectContentScript = async () => {
      try {
        console.log('Injecting content script...');
        await chrome.scripting.executeScript({
          target: { tabId },
          files: ['content.js']
        });
        await chrome.scripting.insertCSS({
          target: { tabId },
          files: ['content-styles.css']
        });
        console.log('Content script injection successful');
      } catch (err) {
        console.error('Content script injection failed:', err);
      }
    };
    
    // Set up interval to check if content script is loaded
    const checkInterval = setInterval(() => {
      chrome.tabs.sendMessage(tabId, { action: 'ping' }, response => {
        if (chrome.runtime.lastError) {
          console.log('Content script still not loaded, retrying...');
          // Try to inject again
          injectContentScript();
        } else if (response && response.status === 'ok') {
          console.log('Content script loaded successfully');
          clearInterval(checkInterval);
          clearTimeout(timeoutId);
          resolve(true);
        }
      });
    }, 500);

    // Set timeout to prevent infinite waiting
    const timeoutId = setTimeout(() => {
      clearInterval(checkInterval);
      console.error('Content script loading timed out after 5 seconds');
      resolve(false);
    }, 5000);
  });
}

// حذف توابع مربوط به کش

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

// Define language utilities directly instead of using dynamic import
// This avoids the ServiceWorker import() restriction
const languageUtils = {
  // RTL languages list
  rtlLanguages: ['ar', 'fa', 'he', 'ur', 'yi', 'ku', 'ps', 'sd', 'ug'],
  
  // Basic language mapping for fallback
  languageMap: {
    'fa': 'Persian',
    'ar': 'Arabic',
    'en': 'English',
    'fr': 'French',
    'de': 'German',
    'es': 'Spanish',
    'zh': 'Chinese',
    'ru': 'Russian',
    'ja': 'Japanese',
    'ko': 'Korean',
    'tr': 'Turkish',
    'it': 'Italian',
    'pt': 'Portuguese',
    'nl': 'Dutch',
    'pl': 'Polish',
    'sv': 'Swedish',
    'he': 'Hebrew',
    'hi': 'Hindi',
    'ur': 'Urdu'
  },
  
  // Check if a language is RTL
  isRTLLanguage: function(langCode) {
    return this.rtlLanguages.includes(langCode);
  },
  
  // Get language name
  getLanguageName: function(langCode, useNative = true) {
    // Since we can't access the full language data in the background script,
    // we'll just return the English name from our basic mapping
    return this.languageMap[langCode] || langCode;
  }
};

// Helper function to determine if a language is RTL
function isRTLLanguage(langCode) {
  return languageUtils.isRTLLanguage(langCode);
}

// Function to get language name for prompt
function getTargetLanguagePrompt(langCode) {
  try {
    // Get the English name of the language
    return languageUtils.getLanguageName(langCode, false);
  } catch (error) {
    console.error('Error getting language name:', error);
    // Fallback to basic mapping
    return languageUtils.languageMap[langCode] || langCode;
  }
}

// اضافه کردن متغیر برای زبان پیش‌فرض
let userPrefLang = 'fa'; // پیش‌فرض فارسی

// تابع جدید برای دریافت زبان مقصد
async function getTargetLanguage() {
  try {
    const result = await chrome.storage.local.get('targetLanguage');
    return result.targetLanguage || userPrefLang;
  } catch (error) {
    console.error('Error getting target language:', error);
    return userPrefLang;
  }
}

// بهبود تابع ترجمه با پشتیبانی از تمام زبان‌های گوگل ترنسلیت
async function translateText(text, targetLang = null) {
  try {
    // Check if text is valid
    if (!text || typeof text !== 'string' || text.trim() === '') {
      throw new Error('Invalid text for translation');
    }
    
    const apiKey = await checkAPIKey();
    if (!apiKey) throw new Error('API key not found');

    const detectedLang = await detectLanguage(text);
    const userPrefLang = await getTargetLanguage(); // دریافت زبان هدف
    const targetLanguage = await getTargetLanguagePrompt(targetLang || userPrefLang);

    const prompt = `Translate the following text from ${detectedLang} to ${targetLanguage}:\n${text}`;

    // اضافه کردن retry mechanism
    let retries = 3;
    while (retries > 0) {
      try {
        const response = await fetch(`${CONFIG.API_ENDPOINT}?key=${apiKey}`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: `[system: You are a translator. Translate exactly as provided to the target language, no extra comments.]\n${prompt}`
              }]
            }],
            generationConfig: {
              temperature: 0.1,  // Slightly increased for better fluency
              topP: 0.8,        // Adjusted for better translation quality
              topK: 40,         // Increased for more diverse outputs
              maxOutputTokens: 2048  // Increased for longer translations
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
          // بررسی خطای rate limit
          if (response.status === 429) {
            retries--;
            if (retries > 0) {
              await new Promise(resolve => setTimeout(resolve, 1000));
              continue;
            }
          }
          throw new Error(errorData?.error?.message || 'API Error');
        }

        const data = await response.json();
        const targetLangCode = targetLang || userPrefLang;
        const isRTL = await isRTLLanguage(targetLangCode);
        return {
          text: data.candidates?.[0]?.content?.parts?.[0]?.text || '',
          sourceLang: detectedLang,
          targetLang: targetLangCode,
          isRTL: isRTL
        };
      } catch (error) {
        if (retries <= 1) throw error;
        retries--;
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  } catch (error) {
    logError(error, 'Translation');
    throw error;
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

// ترجمه دسته‌ای برای ترجمه کل صفحه
async function translateBatch(texts, isRTL = true) {
  const results = [];
  const apiKey = await getApiKey();
  
  if (!apiKey) throw new Error('Please enter your API key in settings');
  
  // تقسیم متن‌ها به دسته‌های کوچکتر برای جلوگیری از خطای محدودیت API
  const batchSize = 5; // کاهش اندازه دسته برای کاهش فشار بر API
  const batches = [];
  
  for (let i = 0; i < texts.length; i += batchSize) {
    batches.push(texts.slice(i, i + batchSize));
  }
  
  // ترجمه هر دسته با تأخیر بین درخواست‌ها
  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    try {
      // ترکیب متن‌ها با جداکننده مشخص
      const combinedText = batch.join('\n---SEPARATOR---\n');
      const translationDirection = isRTL ? 'to_persian' : 'to_english';
      
      // اضافه کردن اطلاعات موضوع ترجمه
      const translationMode = await getTranslationMode();
      let contextPrompt = '';
      
      if (translationMode?.mode) {
        contextPrompt = `Consider this is a ${translationMode.mode} text. `;
        if (translationMode.custom) {
          contextPrompt += translationMode.custom + '. ';
        }
      }
      
      const prompt = translationDirection === 'to_english' 
        ? `${contextPrompt}Translate each of the following texts to English. Keep each text separate:\n${combinedText}`
        : `${contextPrompt}Translate each of the following texts to Persian. Keep each text separate:\n${combinedText}`;

      // تلاش مجدد در صورت خطا
      let retries = 3;
      let success = false;
      let translatedBatch = [];
      
      while (retries > 0 && !success) {
        try {
          const response = await fetch(`${CONFIG.API_ENDPOINT}?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{
                parts: [{
                  text: `[system: You are a translator. Translate exactly as provided, maintain the separator between texts.]\n${prompt}`
                }]
              }],
              generationConfig: {
                temperature: 0.1,
                topP: 0.8,
                topK: 40,
                maxOutputTokens: 4096  // Increased for batch translations
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
            // اگر خطای محدودیت منابع بود، تلاش مجدد با تأخیر
            if (errorData?.error?.message?.includes('Resource has been exhausted')) {
              retries--;
              // تأخیر قبل از تلاش مجدد (افزایش تصاعدی)
              await new Promise(resolve => setTimeout(resolve, (3 - retries) * 1000));
              continue;
            }
            throw new Error(`خطای API: ${errorData?.error?.message || response.status}`);
          }

          const data = await response.json();
          const translatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;

          if (!translatedText) throw new Error('پاسخ API نامعتبر است');

          // تقسیم نتیجه به متن‌های جداگانه
          translatedBatch = translatedText.split('---SEPARATOR---').map(text => text.trim());
          success = true;
        } catch (error) {
          if (retries <= 1) throw error;
          retries--;
          // تأخیر قبل از تلاش مجدد (افزایش تصاعدی)
          await new Promise(resolve => setTimeout(resolve, (3 - retries) * 1000));
        }
      }
      
      // اضافه کردن نتایج به آرایه اصلی
      if (Array.isArray(translatedBatch) && translatedBatch.length > 0) {
        results.push(...translatedBatch);
      } else {
        // اگر ترجمه موفق نبود، متن اصلی را اضافه کنیم
        results.push(...batch);
      }
      
      // تأخیر بین درخواست‌ها برای جلوگیری از محدودیت نرخ API
      if (i < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    } catch (error) {
      console.error('Batch translation error:', error);
      // در صورت خطا، متن اصلی را برگردانیم
      results.push(...batch);
    }
  }
  
  return results;
}

// دریافت تنظیمات موضوع ترجمه
async function getTranslationMode() {
  try {
    const result = await chrome.storage.local.get('translation_mode');
    return result.translation_mode || null;
  } catch (error) {
    console.error('Error getting translation mode:', error);
    return null;
  }
}

// ذخیره در تاریخچه
async function addToHistory(original, translated) {
  try {
    const history = await chrome.storage.local.get('translation_history');
    const translationHistory = history.translation_history || [];
    
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
    
    await chrome.storage.local.set({ translation_history: translationHistory });
    
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
      
      const translation = await translateText(text);
      if (!translation || !translation.text) {
        throw new Error('Translation failed');
      }
      
      try {
        await chrome.tabs.sendMessage(tab.id, {
          action: 'translateSelection',
          translatedText: translation.text,
          isRTL: translation.isRTL
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
        console.error('Error sending page translation request:', err);
        throw new Error('خطا در ترجمه صفحه');
      }
    }
  } catch (error) {
    await handleError(error, 'Context menu action');
    
    // نمایش خطا به کاربر از طریق content script
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
  }
});

// اصلاح message listener
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || !message.action) {
    console.error('Invalid message received');
    return false;
  }
  
  console.log('Received message:', message.action);
  
  if (message.action === 'translate') {
    translateText(message.text, message.targetLang)
      .then(translation => {
        try {
          // Use a safer way to check if we can still send a response
          if (chrome.runtime.id) { // Check if extension is still running
            sendResponse({ success: true, translatedText: translation.text, isRTL: translation.isRTL });
          }
        } catch (error) {
          console.log('Channel closed, ignoring response:', error);
        }
      })
      .catch(error => {
        try {
          // Use a safer way to check if we can still send a response
          if (chrome.runtime.id) { // Check if extension is still running
            sendResponse({ success: false, error: error.message });
          }
        } catch (error) {
          console.log('Channel closed, ignoring response:', error);
        }
      });

    return true; // Will respond asynchronously
  }
  
  if (message.action === 'translateBatch') {
    translateBatch(message.texts, message.isRTL)
      .then(translations => {
        if (chrome.runtime.lastError) {
          console.error('Error sending response:', chrome.runtime.lastError);
          return;
        }
        try {
          sendResponse({ success: true, translations });
        } catch (error) {
          console.log('Channel closed, ignoring response');
        }
      })
      .catch(error => {
        if (chrome.runtime.lastError) {
          console.error('Error sending response:', chrome.runtime.lastError);
          return;
        }
        try {
          sendResponse({ success: false, error: error.message });
        } catch (error) {
          console.log('Channel closed, ignoring response');
        }
      });

    return true; // Will respond asynchronously
  }

  return false; // Will not respond
});

// مدیریت پیام‌ها با تایم‌اوت و بررسی خطا - این لیسنر جایگزین لیسنر قبلی می‌شود
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
    const translationPromise = translateText(message.text, message.targetLang || message.forceDirection);
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
              isRTL: translation.isRTL 
            });
          }
        } catch (e) {
          console.log('Channel closed before response could be sent:', e);
        }
      })
      .catch(error => {
        try {
          // Use a safer way to check if we can still send a response
          if (chrome.runtime.id) { // Check if extension is still running
            sendResponse({ success: false, error: error.message });
          }
        } catch (e) {
          console.log('Channel closed before error could be sent:', e);
        }
      });

    return true; // Will respond asynchronously
  }
  
  if (message.action === 'translateBatch') {
    translateBatch(message.texts, message.isRTL)
      .then(translations => {
        try {
          // Use a safer way to check if we can still send a response
          if (chrome.runtime.id) { // Check if extension is still running
            sendResponse({ success: true, translations });
          }
        } catch (error) {
          console.log('Channel closed, ignoring response:', error);
        }
      })
      .catch(error => {
        try {
          // Use a safer way to check if we can still send a response
          if (chrome.runtime.id) { // Check if extension is still running
            sendResponse({ success: false, error: error.message });
          }
        } catch (error) {
          console.log('Channel closed, ignoring response:', error);
        }
      });

    return true; // Will respond asynchronously
  }

  return false; // Will not respond
}); // این لیسنر جایگزین لیسنر قبلی می‌شود

// اضافه کردن event listener برای خطاهای uncaught
chrome.runtime.onInstalled.addListener(() => {
  console.log('Extension installed/updated');
});
/**
 * Gemini Translator Extension - Popup Script
 * اسکریپت مربوط به پنجره پاپ‌آپ افزونه مترجم جمینای
 * طراحی شده با استانداردهای مایکروسافت
 */

// Import language utilities
import { languages, getSupportedLanguages, getLanguageDirection } from './src/utils/languages.js';
import { TranslationProgress } from './src/utils/progress.js';

document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const settingsBtn = document.getElementById('settingsBtn');
  const helpBtn = document.getElementById('helpBtn');
  const closeSettingsBtn = document.getElementById('closeSettings');
  const closeHelpBtn = document.getElementById('closeHelp');
  const settingsPanel = document.getElementById('settingsPanel');
  const helpPanel = document.getElementById('helpPanel');
  const translateBtn = document.getElementById('translateBtn');
  const swapDirectionBtn = document.getElementById('swapDirectionBtn');
  const targetLanguageSelect = document.getElementById('targetLanguage');
  const translationModeSelect = document.getElementById('translationMode');
  const customInstructionsTextarea = document.getElementById('customInstructions');
  const apiKeyInput = document.getElementById('apiKeyInput');
  const saveApiKeyBtn = document.getElementById('saveApiKeyBtn');
  const statusCard = document.getElementById('statusCard');
  const statusText = document.getElementById('statusText');
  const themeRadios = document.querySelectorAll('input[name="theme"]');
  const allLanguagesGroup = document.getElementById('allLanguages');
  const languageSearchInput = document.getElementById('languageSearch');

  // Constants
  const STORAGE_KEYS = {
    API_KEY: 'gemini_api_key',
    TARGET_LANGUAGE: 'target_language',
    SOURCE_LANGUAGE: 'source_language',
    TRANSLATION_MODE: 'translation_mode',
    CUSTOM_INSTRUCTIONS: 'custom_instructions',
    THEME: 'app_theme'
  };

  // State
  let state = {
    apiKey: '',
    targetLanguage: 'fa',
    sourceLanguage: 'en',
    translationMode: 'general',
    customInstructions: '',
    theme: 'auto'
  };

  // Initialize
  function init() {
    initializeLanguageDropdown();
    initializeLanguageSearch();
    loadSettings();
    setupEventListeners();
    updateDirectionText();
    applyTheme();
  }

  // Initialize language dropdown
  function initializeLanguageDropdown() {
    const supportedLanguages = getSupportedLanguages();
    const frequentlyUsed = ['fa', 'en', 'ar', 'tr', 'de', 'es', 'fr', 'ru', 'zh']; // زبان‌های پرکاربرد
    
    // Clear existing options in the allLanguages group
    while (allLanguagesGroup.firstChild) {
      allLanguagesGroup.removeChild(allLanguagesGroup.firstChild);
    }
    
    // حذف زبان‌های پرکاربرد از لیست کامل
    const otherLanguages = supportedLanguages.filter(lang => 
      !frequentlyUsed.includes(lang.code)
    ).sort((a, b) => a.nativeName.localeCompare(b.nativeName));

    // اضافه کردن سایر زبان‌ها
    otherLanguages.forEach(lang => {
      const option = document.createElement('option');
      option.value = lang.code;
      option.textContent = `${lang.nativeName} - ${lang.name}`;
      option.dir = getLanguageDirection(lang.code);
      option.setAttribute('data-rtl', lang.isRTL.toString());
      allLanguagesGroup.appendChild(option);
    });

    // تنظیم زبان پیش‌فرض
    targetLanguageSelect.value = state.targetLanguage;
    targetLanguageSelect.dir = getLanguageDirection(state.targetLanguage);
    
    // Update the document direction based on the selected language
    updateDocumentDirection(state.targetLanguage);
  }

  // Initialize language search
  function initializeLanguageSearch() {
    const searchInput = document.getElementById('languageSearch');
    const targetLanguageSelect = document.getElementById('targetLanguage');

    if (searchInput && targetLanguageSelect) {
      // Focus search input when clicking on it
      searchInput.addEventListener('focus', () => {
        // Expand dropdown when focusing on search
        if (targetLanguageSelect.size <= 1) {
          targetLanguageSelect.size = 6;
        }
      });

      // Handle search input
      searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const options = targetLanguageSelect.getElementsByTagName('option');

        let visibleCount = 0;
        Array.from(options).forEach(option => {
          // Search in both native name, English name and language code
          const text = `${option.textContent} ${option.value}`.toLowerCase();
          const matches = text.includes(searchTerm);
          option.classList.toggle('option-hidden', !matches);
          if (matches) visibleCount++;

          // اگر همه گزینه‌های یک گروه مخفی شدند، گروه را مخفی کن
          const optgroup = option.parentElement;
          if (optgroup.tagName === 'OPTGROUP') {
            const visibleOptions = Array.from(optgroup.children).some(opt => !opt.classList.contains('option-hidden'));
            optgroup.style.display = visibleOptions ? '' : 'none';
          }
        });

        // Adjust dropdown size based on visible options
        targetLanguageSelect.size = Math.min(Math.max(visibleCount, 1), 8);
      });

      // پاک کردن جستجو با کلید Escape
      searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          searchInput.value = '';
          const event = new Event('input');
          searchInput.dispatchEvent(event);
          searchInput.blur();
          targetLanguageSelect.size = 1;
        }
      });

      // Reset dropdown when clicking outside
      document.addEventListener('click', (e) => {
        if (e.target !== searchInput && e.target !== targetLanguageSelect) {
          targetLanguageSelect.size = 1;
        }
      });
    }
  }

  // Load settings from storage
  async function loadSettings() {
    try {
      const result = await chrome.storage.local.get([
        STORAGE_KEYS.API_KEY,
        STORAGE_KEYS.TARGET_LANGUAGE,
        STORAGE_KEYS.SOURCE_LANGUAGE,
        STORAGE_KEYS.TRANSLATION_MODE,
        STORAGE_KEYS.CUSTOM_INSTRUCTIONS,
        STORAGE_KEYS.THEME
      ]);

      // Update state with stored values
      state.apiKey = result[STORAGE_KEYS.API_KEY] || '';
      state.targetLanguage = result[STORAGE_KEYS.TARGET_LANGUAGE] || 'fa';
      state.sourceLanguage = result[STORAGE_KEYS.SOURCE_LANGUAGE] || 'en';
      state.translationMode = result[STORAGE_KEYS.TRANSLATION_MODE]?.mode || 'general';
      state.customInstructions = result[STORAGE_KEYS.CUSTOM_INSTRUCTIONS] || '';
      state.theme = result[STORAGE_KEYS.THEME] || 'auto';

      // Update UI
      apiKeyInput.value = state.apiKey;
      targetLanguageSelect.value = state.targetLanguage;
      targetLanguageSelect.dir = getLanguageDirection(state.targetLanguage);
      
      if (translationModeSelect) {
        translationModeSelect.value = state.translationMode;
      }
      
      if (customInstructionsTextarea) {
        customInstructionsTextarea.value = state.customInstructions;
      }

      // Set theme radio
      const themeRadio = document.querySelector(`input[name="theme"][value="${state.theme}"]`);
      if (themeRadio) {
        themeRadio.checked = true;
      }

      // Show API status
      updateApiStatus();
    } catch (error) {
      console.error('Error loading settings:', error);
      showStatus('خطا در بارگذاری تنظیمات', 'error');
    }
  }

  // Setup event listeners
  function setupEventListeners() {
    // Settings panel
    settingsBtn?.addEventListener('click', () => togglePanel(settingsPanel));
    closeSettingsBtn?.addEventListener('click', () => togglePanel(settingsPanel, false));

    // Help panel
    helpBtn?.addEventListener('click', () => togglePanel(helpPanel));
    closeHelpBtn?.addEventListener('click', () => togglePanel(helpPanel, false));

    // Save API key
    saveApiKeyBtn?.addEventListener('click', saveApiKey);

    // Translation direction
    swapDirectionBtn?.addEventListener('click', swapTranslationDirection);

    // Target language change
    targetLanguageSelect?.addEventListener('change', (e) => {
      state.targetLanguage = e.target.value;
      saveSettings(STORAGE_KEYS.TARGET_LANGUAGE, state.targetLanguage);
      updateDirectionText();
      targetLanguageSelect.dir = getLanguageDirection(state.targetLanguage);
      updateDocumentDirection(state.targetLanguage);
    });

    // Translation mode change
    translationModeSelect?.addEventListener('change', (e) => {
      state.translationMode = e.target.value;
      saveSettings(STORAGE_KEYS.TRANSLATION_MODE, { mode: state.translationMode });
    });

    // Custom instructions change
    customInstructionsTextarea?.addEventListener('change', (e) => {
      state.customInstructions = e.target.value;
      saveSettings(STORAGE_KEYS.CUSTOM_INSTRUCTIONS, state.customInstructions);
    });

    // Theme change
    themeRadios.forEach(radio => {
      radio.addEventListener('change', (e) => {
        if (e.target.checked) {
          state.theme = e.target.value;
          saveSettings(STORAGE_KEYS.THEME, state.theme);
          applyTheme();
        }
      });
    });

    // Translate button
    translateBtn?.addEventListener('click', translateSelectedText);

    // Keyboard shortcuts
    document.addEventListener('keydown', handleKeyboardShortcuts);
  }

  // Toggle panels (settings, help)
  function togglePanel(panel, show = true) {
    if (!panel) return;
    
    if (show) {
      // Hide any other open panels first
      document.querySelectorAll('.settings-panel, .help-panel').forEach(p => {
        if (p !== panel) p.classList.remove('active');
      });
      panel.classList.add('active');
    } else {
      panel.classList.remove('active');
    }
  }

  // Save API key
  async function saveApiKey() {
    const apiKey = apiKeyInput.value.trim();
    if (!apiKey) {
      showStatus('لطفاً کلید API را وارد کنید', 'error');
      return;
    }

    try {
      state.apiKey = apiKey;
      await saveSettings(STORAGE_KEYS.API_KEY, apiKey);
      await saveSettings('app_settings', { apiKey });
      showStatus('کلید API با موفقیت ذخیره شد', 'success');
      togglePanel(settingsPanel, false);
      updateApiStatus();
    } catch (error) {
      console.error('Error saving API key:', error);
      showStatus('خطا در ذخیره کلید API', 'error');
    }
  }

  // Save settings to storage
  async function saveSettings(key, value) {
    try {
      await chrome.storage.local.set({ [key]: value });
      return true;
    } catch (error) {
      console.error(`Error saving ${key}:`, error);
      return false;
    }
  }

  // Swap translation direction
  function swapTranslationDirection() {
    const temp = state.sourceLanguage;
    state.sourceLanguage = state.targetLanguage;
    state.targetLanguage = temp;

    saveSettings(STORAGE_KEYS.SOURCE_LANGUAGE, state.sourceLanguage);
    saveSettings(STORAGE_KEYS.TARGET_LANGUAGE, state.targetLanguage);

    targetLanguageSelect.value = state.targetLanguage;
    targetLanguageSelect.dir = getLanguageDirection(state.targetLanguage);
    updateDirectionText();
  }

  // Update direction text
  function updateDirectionText() {
    const directionText = document.querySelector('.direction-text');
    if (!directionText) return;

    const sourceLangName = getLanguageName(state.sourceLanguage);
    const targetLangName = getLanguageName(state.targetLanguage);
    directionText.textContent = `${sourceLangName} → ${targetLangName}`;
  }

  // Get language name from code
  function getLanguageName(langCode, useNative = true) {
    const lang = languages[langCode];
    if (!lang) return langCode;
    return useNative ? lang.nativeName : lang.name;
  }

  // Translate selected text
  async function translateSelectedText() {
    if (!state.apiKey) {
      showStatus('لطفاً ابتدا کلید API را در تنظیمات وارد کنید', 'error');
      togglePanel(settingsPanel, true);
      return;
    }

    try {
      const progress = TranslationProgress.getInstance();
      progress.reset();
      progress.show();
      
      // Get active tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      // Check if we can access the tab
      try {
        // First check if content script is loaded by sending a ping
        chrome.tabs.sendMessage(tab.id, { action: 'ping' }, function(pingResponse) {
          // If we get here with an error, the content script isn't loaded
          if (chrome.runtime.lastError) {
            console.error('Content script not available:', chrome.runtime.lastError);
            showStatus('افزونه در این صفحه قابل استفاده نیست', 'error');
            progress.hide();
            return;
          }
          
          // Content script is loaded, now get selected text
          chrome.tabs.sendMessage(tab.id, { action: 'getSelectedText' }, async (response) => {
            if (chrome.runtime.lastError) {
              console.error('Error sending message:', chrome.runtime.lastError);
              showStatus('خطا در ارتباط با صفحه', 'error');
              progress.hide();
              return;
            }

            if (!response || !response.selectedText) {
              showStatus('لطفاً ابتدا متنی را در صفحه انتخاب کنید', 'warning');
              progress.hide();
              return;
            }

            const selectedText = response.selectedText;
            const chunks = selectedText.match(/.{1,500}/g) || [selectedText];
            let translatedChunks = [];
            
            for (let i = 0; i < chunks.length; i++) {
              if (progress.isCancelRequested()) {
                showStatus('ترجمه لغو شد', 'warning');
                return;
              }

              try {
                // Send chunk to background script for translation
                const result = await new Promise((resolve, reject) => {
                  try {
                    chrome.runtime.sendMessage({
                      action: 'translate',
                      text: chunks[i],
                      sourceLanguage: state.sourceLanguage,
                      targetLanguage: state.targetLanguage,
                      mode: state.translationMode,
                      customInstructions: state.customInstructions
                    }, (response) => {
                      if (chrome.runtime.lastError) {
                        console.error('Runtime error:', chrome.runtime.lastError);
                        reject(new Error(chrome.runtime.lastError.message || 'خطا در ارتباط با سرور'));
                        return;
                      }
                      
                      if (!response) {
                        reject(new Error('پاسخی از سرور دریافت نشد'));
                        return;
                      }
                      
                      if (response.error) {
                        reject(new Error(response.error));
                      } else {
                        resolve(response.translatedText);
                      }
                    });
                  } catch (err) {
                    console.error('Error sending message:', err);
                    reject(new Error('خطا در ارسال درخواست ترجمه'));
                  }
                });

                translatedChunks.push(result);
                progress.updateProgress(((i + 1) / chunks.length) * 100);
              } catch (error) {
                console.error('Error translating chunk:', error);
                showStatus(`خطا در ترجمه: ${error.message}`, 'error');
                progress.hide();
                return;
              }
            }

            // Send complete translation to content script
            try {
              await chrome.tabs.sendMessage(tab.id, {
                action: 'translateSelection',
                translatedText: translatedChunks.join(''),
                isRTL: isRTLLanguage(state.targetLanguage)
              }, response => {
                if (chrome.runtime.lastError) {
                  console.error('Error sending translation to content script:', chrome.runtime.lastError);
                  showStatus('خطا در نمایش ترجمه', 'error');
                  return;
                }
              });
              
              progress.hide();
              showStatus('ترجمه با موفقیت انجام شد', 'success');
            } catch (error) {
              console.error('Error sending translation to content script:', error);
              showStatus('خطا در نمایش ترجمه', 'error');
              return;
            }
          });
        });
      } catch (error) {
        console.error('Error in translation process:', error);
        showStatus('خطا در فرآیند ترجمه', 'error');
        TranslationProgress.getInstance().hide();
      }
    } catch (error) {
      console.error('Error in translation process:', error);
      showStatus('خطا در فرآیند ترجمه', 'error');
      TranslationProgress.getInstance().hide();
    }
  }

  // Check if language is RTL
function isRTLLanguage(langCode) {
  try {
    return languages[langCode]?.isRTL || false;
  } catch (error) {
    console.error('Error checking RTL language:', error);
    return false;
  } finally {
    // Ensure cleanup if needed in the future
  }
}

  // Show status message
  function showStatus(message, type = 'info') {
    if (!statusCard || !statusText) return;
    
    // Update status icon
    const statusIcon = statusCard.querySelector('.status-icon');
    if (statusIcon) {
      statusIcon.className = `status-icon ${type} rounded-full`;
    }
    
    // Update status text
    statusText.textContent = message;
    
    // Show status card
    statusCard.classList.remove('d-none');
    
    // Auto-hide success messages after 3 seconds
    if (type === 'success') {
      setTimeout(() => {
        if (statusCard) {
          statusCard.classList.add('d-none');
        }
      }, 3000);
    }
  }

  // Update API status
  function updateApiStatus() {
    if (!statusCard) return;
    
    if (state.apiKey) {
      showStatus('آماده برای ترجمه', 'success');
      setTimeout(() => {
        if (statusCard) {
          statusCard.classList.add('d-none');
        }
      }, 2000);
    } else {
      showStatus('کلید API تنظیم نشده است', 'warning');
    }
  }

  // Handle keyboard shortcuts
  function handleKeyboardShortcuts(e) {
    // Esc key to close panels
    if (e.key === 'Escape') {
      document.querySelectorAll('.settings-panel, .help-panel').forEach(panel => {
        if (panel.classList.contains('active')) {
          togglePanel(panel, false);
          e.preventDefault();
        }
      });
    }
    
    // Alt + T to translate
    if (e.altKey && e.key === 't' && !e.shiftKey) {
      translateSelectedText();
      e.preventDefault();
    }
    
    // Alt + Shift + T to translate and copy
    if (e.altKey && e.shiftKey && e.key === 'T') {
      // Future implementation for translate and copy
      e.preventDefault();
    }
  }

  // Apply theme
  function applyTheme() {
    if (state.theme === 'auto') {
      document.documentElement.removeAttribute('data-theme');
    } else {
      document.documentElement.setAttribute('data-theme', state.theme);
    }
  }

  // Update document direction based on language
  function updateDocumentDirection(langCode) {
    const direction = isRTLLanguage(langCode) ? 'rtl' : 'ltr';
    document.documentElement.dir = direction;
    document.documentElement.lang = langCode;
  }

  // Initialize the popup
  init();
});
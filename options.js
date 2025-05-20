import { getStorageKeys } from './src/utils/config.js';

document.addEventListener('DOMContentLoaded', () => {
  const storageKeys = getStorageKeys();
  // حذف تنظیمات مربوط به auto-translate
  const apiInput = document.getElementById('apiKeyInput');
  const addBtn = document.getElementById('addApiBtn');
  const apiList = document.getElementById('apiList');
  const STATUS_KEY = storageKeys.API_KEY; // Updated

  const modeSelect = document.getElementById('translationMode');
  const customMode = document.getElementById('customMode');

  function showStatus(message, isError = false) {
    const statusEl = document.createElement('div');
    statusEl.className = `status ${isError ? 'error' : 'success'}`;
    statusEl.textContent = message;
    document.body.appendChild(statusEl);
    setTimeout(() => statusEl.remove(), 3000);
  }

  function renderApiList(key) {
    if (!key) {
      apiList.innerHTML = '<li class="no-key">No API key registered</li>';
      return;
    }
    apiList.innerHTML = `
      <li class="api-key-item">
        <span>${key.substring(0, 10)}...</span>
        <div class="button-group">
          <button class="copyBtn">Copy</button>
          <button class="deleteBtn">Delete</button>
        </div>
      </li>`;
    
    document.querySelector('.copyBtn')?.addEventListener('click', () => {
      navigator.clipboard.writeText(key)
        .then(() => showStatus('API key copied successfully'))
        .catch(() => showStatus('Error copying API key', true));
    });
    
    document.querySelector('.deleteBtn')?.addEventListener('click', deleteApiKey);
  }

  async function loadApiKey() {
    const result = await chrome.storage.local.get(STATUS_KEY);
    renderApiList(result[STATUS_KEY]);
  }

  async function saveApiKey(newKey) {
    try {
      // ذخیره در chrome.storage
      await chrome.storage.local.set({ [STATUS_KEY]: newKey });
      
      // ذخیره در تنظیمات برنامه - Removed as per instruction
      // await chrome.storage.local.set({ 
      //   [storageKeys.APP_CONFIG]: { apiKey: newKey } // Assuming APP_CONFIG is the key for app_settings
      // });
      
      showStatus('API key saved successfully');
      await loadApiKey();
      apiInput.value = '';
    } catch (error) {
      console.error('Error saving API key:', error);
      showStatus('Error saving API key', true);
    }
  }

  async function deleteApiKey() {
    try {
      await chrome.storage.local.remove([STATUS_KEY]);
      // await chrome.storage.local.set({ 
      //  [storageKeys.APP_CONFIG]: { apiKey: '' } // Assuming APP_CONFIG is the key for app_settings
      // }); // Removed
      showStatus('API key deleted successfully');
      await loadApiKey();
    } catch (error) {
      console.error('Error deleting API key:', error);
      showStatus('Error deleting API key', true);
    }
  }

  // ذخیره تنظیمات موضوع ترجمه
  async function saveTranslationMode() {
    const mode = modeSelect.value;
    const customText = customMode.value.trim();
    
    await chrome.storage.local.set({
      [storageKeys.TRANSLATION_MODE]: { // Updated
        mode: mode,
        custom: customText
      }
    });

    showStatus('Translation topic settings saved');
  }

  // بارگذاری تنظیمات موضوع
  async function loadTranslationMode() {
    const result = await chrome.storage.local.get(storageKeys.TRANSLATION_MODE); // Updated
    if (result[storageKeys.TRANSLATION_MODE]) {
      modeSelect.value = result[storageKeys.TRANSLATION_MODE].mode;
      customMode.value = result[storageKeys.TRANSLATION_MODE].custom || '';
    }
  }

  // اضافه کردن استایل‌های لازم
  const style = document.createElement('style');
  style.textContent = `
    .status {
      position: fixed;
      bottom: 20px;
      right: 20px;
      padding: 10px 20px;
      border-radius: 4px;
      color: white;
      animation: fadeIn 0.3s ease;
    }
    .success { background: #4CAF50; }
    .error { background: #F44336; }
    .api-key-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px;
      background: #f5f5f5;
      border-radius: 4px;
      margin: 5px 0;
    }
    .button-group {
      display: flex;
      gap: 5px;
    }
    .copyBtn, .deleteBtn {
      padding: 5px 10px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
    }
    .copyBtn { background: #2196F3; color: white; }
    .deleteBtn { background: #F44336; color: white; }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `;
  document.head.appendChild(style);

  addBtn.addEventListener('click', () => {
    const key = apiInput.value.trim();
    if (key) {
      saveApiKey(key);
    } else {
      showStatus('لطفاً کلید API را وارد کنید', true);
    }
  });

  modeSelect.addEventListener('change', saveTranslationMode);
  customMode.addEventListener('blur', saveTranslationMode);

  // حذف کلیه تنظیمات auto-translate از storage
  chrome.storage.local.remove(['auto_translate_enabled']);

  // بارگذاری اولیه
  loadTranslationMode();
  loadApiKey();
});

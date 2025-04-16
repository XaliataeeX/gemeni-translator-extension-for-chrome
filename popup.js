document.addEventListener('DOMContentLoaded', () => {
  // Get DOM elements
  const settingsBtn = document.getElementById('settingsBtn');
  const settingsPanel = document.getElementById('settingsPanel');
  const closeSettingsBtn = document.getElementById('closeSettings');
  const apiKeyInput = document.getElementById('apiKeyInput');
  const saveApiKeyBtn = document.getElementById('saveApiKeyBtn');
  const translateBtn = document.getElementById('translate-btn');
  const swapBtn = document.getElementById('swap-btn');
  const targetLangSelect = document.getElementById('targetLanguage');

  // Settings panel handlers
  if (settingsBtn) {
    settingsBtn.addEventListener('click', () => {
      console.log('Settings button clicked'); // Debug log
      if (settingsPanel) {
        settingsPanel.style.display = 'block';
        settingsPanel.style.visibility = 'visible';
        settingsPanel.style.opacity = '1';
        settingsPanel.style.transform = 'translateX(0)';
        
        // Load and show current API key
        chrome.storage.local.get('gemini_api_key', (result) => {
          if (result.gemini_api_key) {
            apiKeyInput.value = result.gemini_api_key;
          }
        });
      }
    });
  }

  if (closeSettingsBtn) {
    closeSettingsBtn.addEventListener('click', () => {
      if (settingsPanel) {
        settingsPanel.style.transform = 'translateX(100%)';
        settingsPanel.style.opacity = '0';
        setTimeout(() => {
          settingsPanel.style.visibility = 'hidden';
          settingsPanel.style.display = 'none';
        }, 300);
      }
    });
  }

  // Save API key
  if (saveApiKeyBtn) {
    saveApiKeyBtn.addEventListener('click', async () => {
      const apiKey = apiKeyInput.value.trim();
      if (apiKey) {
        await chrome.storage.local.set({ gemini_api_key: apiKey });
        
        // Close settings panel
        settingsPanel.style.transform = 'translateX(100%)';
        settingsPanel.style.opacity = '0';
        setTimeout(() => {
          settingsPanel.style.visibility = 'hidden';
          settingsPanel.style.display = 'none';
        }, 300);

        // Show success message
        const statusText = document.querySelector('.status-text');
        if (statusText) {
          const originalText = statusText.textContent;
          statusText.textContent = 'API key saved successfully!';
          setTimeout(() => {
            statusText.textContent = originalText;
          }, 2000);
        }
      }
    });
  }

  // Handle translation
  if (translateBtn) {
    translateBtn.addEventListener('click', async () => {
      // Your existing translation logic
    });
  }

  // Handle direction swap
  if (swapBtn) {
    swapBtn.addEventListener('click', () => {
      // Your existing swap logic
    });
  }

  // Initialize
  function init() {
    // Load saved language preference
    chrome.storage.local.get('target_language', (result) => {
      if (result.target_language) {
        targetLangSelect.value = result.target_language;
      }
    });
  }

  init();
});
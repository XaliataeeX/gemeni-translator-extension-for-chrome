(() => {
  let currentBox = null;
  let isRTLTranslation = true;

  // Register content script immediately
  chrome.runtime.sendMessage({ action: 'ping' }, response => {
    console.log('Content script initialized:', response || 'No response');
  });

  // Handle connection errors
  function handleRuntimeError() {
    const lastError = chrome.runtime.lastError;
    if (lastError) {
      console.log('Runtime error:', lastError.message);
      return true;
    }
    return false;
  }

  // Listen for messages from popup and background
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('Content script received message:', message);
    
    try {
      if (message.action === 'ping') {
        sendResponse({ status: 'ok' });
        return true;
      } else if (message.action === 'translateSelection') {
        const selection = window.getSelection();
        const text = selection ? selection.toString().trim() : '';
        if (text) {
          try {
            const range = selection.getRangeAt(0);
            const rect = range.getBoundingClientRect();
            showTranslationBox(text, message.translatedText, rect, message.isRTL);
          } catch (err) {
            console.error('Error showing translation box:', err);
            showErrorNotification('خطا در نمایش ترجمه');
          }
        } else {
          console.log('No text selected for translation');
        }
        sendResponse({ status: 'ok' });
        return true;
      } else if (message.action === 'showError') {
        showErrorNotification(message.error || 'خطای نامشخص');
        sendResponse({ status: 'ok' });
        return true;
      } else if (message.action === 'getSelectedText') {
        const selection = window.getSelection();
        const text = selection ? selection.toString().trim() : '';
        sendResponse({ status: 'ok', selectedText: text });
        return true;
      } else if (message.action === 'error') {
        showErrorNotification(message.error || 'خطای نامشخص');
        sendResponse({ status: 'ok' });
        return true;
      }
      
      // Default response for unknown actions
      sendResponse({ status: 'unknown_action' });
      return true;
    } catch (error) {
      console.error('Content script error:', error);
      sendResponse({ status: 'error', error: error.message });
      return true;
    }
    
    // Always return true to indicate async response
    return true;
  });

  function handleClickOutside(e) {
    if (currentBox && !currentBox.contains(e.target)) {
      removeBox();
    }
  }

  function handleKeydown(e) {
    if (e.key === 'Escape' && currentBox) {
      removeBox();
    }
  }

  function showTranslationBox(originalText, translatedText, rect, isRTL = true) {
    try {
      console.log('Showing translation box:', { originalText, translatedText, isRTL }); // Debug log
      
      if (currentBox) currentBox.remove(); // This will also remove old keydown listener via removeBox()

      const box = document.createElement('div');
      box.className = 'translation-box';
      
      box.innerHTML = `
        <div class="translation-content" dir="${isRTL ? 'rtl' : 'ltr'}">
          ${processText(translatedText, originalText)}
        </div>
        <div class="translation-actions">
          <button class="toggle-btn">متن اصلی</button>
          <button class="copy-btn">کپی</button>
          <button class="close-btn">×</button>
        </div>
      `;

      // Calculate optimal position
      const pos = calculateOptimalPosition(rect, { width: 400, height: 300 });
      
      box.style.cssText = `
        position: fixed !important;
        left: ${pos.left}px !important;
        top: ${pos.top}px !important;
        z-index: 2147483647 !important;
      `;
      
      document.body.appendChild(box);
      currentBox = box;

      setupEventListeners(box, originalText, translatedText, isRTL);
      requestAnimationFrame(() => box.classList.add('show'));

    } catch (error) {
      console.error('Error showing translation box:', error);
      showErrorNotification(error.message || 'Error displaying translation');
    }
  }

  function calculateOptimalPosition(rect, box) {
    const margin = 16;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    let left = rect.right + margin;
    let top = rect.top;

    // Check if box would go off the right edge
    if (left + box.width > viewportWidth - margin) {
      // Try to position to the left of the selection
      left = Math.max(margin, rect.left - box.width - margin);
      
      // If still doesn't fit, center it horizontally
      if (left <= margin) {
        left = Math.max(margin, (viewportWidth - box.width) / 2);
      }
    }

    // Check if box would go off the bottom edge
    if (top + box.height > viewportHeight - margin) {
      // Try to position above the selection
      top = Math.max(margin, rect.top - box.height - margin);
      
      // If still doesn't fit, position at the top with margin
      if (top <= margin) {
        top = margin;
      }
    }

    return { left, top };
  }

  function setupEventListeners(box, originalText, translatedText, isRTL) {
    const content = box.querySelector('.translation-content');
    const toggleBtn = box.querySelector('.toggle-btn');
    const copyBtn = box.querySelector('.copy-btn');
    const closeBtn = box.querySelector('.close-btn');
    let showingOriginal = false;

    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        showingOriginal = !showingOriginal;
        content.dir = showingOriginal ? (isRTL ? 'ltr' : 'rtl') : (isRTL ? 'rtl' : 'ltr');
        content.innerHTML = processText(showingOriginal ? originalText : translatedText, originalText);
        toggleBtn.textContent = showingOriginal ? 'متن ترجمه' : 'متن اصلی';
      });
    }

    if (copyBtn) {
      copyBtn.addEventListener('click', () => {
        const textToCopy = showingOriginal ? originalText : translatedText;
        navigator.clipboard.writeText(textToCopy).then(() => {
          const originalText = copyBtn.textContent;
          copyBtn.textContent = 'کپی شد!';
          setTimeout(() => copyBtn.textContent = originalText, 1500);
        });
      });
    }

    if (closeBtn) {
      closeBtn.addEventListener('click', removeBox);
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeydown);
  }

  function processText(text, originalText = '') {
    // Split both texts into lines
    const translatedLines = text.split('\n');
    const originalLines = originalText.split('\n');
    
    // Extract emojis from original text to preserve them
    const emojiRegex = /[\p{Emoji}\p{Emoji_Presentation}\p{Emoji_Modifier}\p{Emoji_Modifier_Base}\p{Emoji_Component}]/gu;
    const originalEmojis = originalText.match(emojiRegex) || [];
    
    // Process each line, preserving structure
    return translatedLines.map((line, index) => {
      // Preserve emojis from original text if available
      let processedLine = line;
      if (originalEmojis.length > 0) {
        // Find emojis in the current line of original text
        const lineEmojis = (originalLines[index] || '').match(emojiRegex) || [];
        
        // Add emojis to the translated line in the same positions if possible
        lineEmojis.forEach(emoji => {
          if (!processedLine.includes(emoji)) {
            // Simple approach: append emoji at the end if not found
            processedLine += ` ${emoji}`;
          }
        });
      }
      
      return line.trim() ? 
        `<div class="translation-line">${escapeHtml(processedLine)}</div>` : 
        '<br>';
    }).join('');
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function removeBox() {
    if (currentBox) {
      currentBox.classList.remove('show');
      setTimeout(() => {
        if (currentBox) {
          currentBox.remove();
          currentBox = null;
        }
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('keydown', handleKeydown);
      }, 200);
    }
  }

  function showErrorNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'translation-error-notification';
    notification.innerHTML = `
      <div class="error-icon">✗</div>
      <div class="error-message">${message}</div>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.classList.add('fade-out');
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }

  // Cleanup on unload
  window.addEventListener('unload', () => {
    if (currentBox) {
      removeBox();
    }
    document.removeEventListener('mousedown', handleClickOutside);
  });
})();
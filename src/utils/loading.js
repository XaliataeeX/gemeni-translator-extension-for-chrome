export class ProgressiveLoader {
  static async loadTranslation(text, onProgress) {
    const chunks = text.match(/.{1,500}/g) || [];
    let result = '';
    
    for (let i = 0; i < chunks.length; i++) {
      const translation = await TranslationService.getInstance().translate(chunks[i]);
      result += translation.text;
      onProgress((i + 1) / chunks.length * 100);
    }
    
    return result;
  }
}

// Loading state management for Gemini Translator
// پیاده‌سازی مدیریت وضعیت بارگذاری برای مترجم جمینای

const LOADING_TEMPLATE = `
  <div class="loading-overlay">
    <div class="loading-content">
      <div class="loading-spinner"></div>
      <div class="loading-message"></div>
      <div class="loading-progress">
        <div class="progress-bar"></div>
      </div>
    </div>
  </div>
`;

export class LoadingManager {
  constructor() {
    this.overlay = null;
    this.message = null;
    this.progressBar = null;
    this.progress = 0;
    this.isVisible = false;
  }

  show(message = 'در حال ترجمه...', initialProgress = 0) {
    if (!this.overlay) {
      this.createOverlay();
    }

    this.message.textContent = message;
    this.setProgress(initialProgress);
    this.overlay.classList.add('show');
    this.isVisible = true;

    // Add subtle animation
    requestAnimationFrame(() => {
      this.progressBar.style.transition = 'width 0.3s ease-out';
    });
  }

  hide() {
    if (!this.overlay || !this.isVisible) return;

    this.overlay.classList.add('fade-out');
    this.isVisible = false;

    setTimeout(() => {
      this.overlay.classList.remove('show', 'fade-out');
      this.setProgress(0);
    }, 300);
  }

  setProgress(value) {
    this.progress = Math.min(100, Math.max(0, value));
    if (this.progressBar) {
      this.progressBar.style.width = `${this.progress}%`;
    }
  }

  updateMessage(message) {
    if (this.message) {
      this.message.textContent = message;
    }
  }

  createOverlay() {
    const container = document.createElement('div');
    container.innerHTML = LOADING_TEMPLATE.trim();
    this.overlay = container.firstElementChild;
    this.message = this.overlay.querySelector('.loading-message');
    this.progressBar = this.overlay.querySelector('.progress-bar');
    document.body.appendChild(this.overlay);
  }

  // Singleton pattern
  static getInstance() {
    if (!LoadingManager.instance) {
      LoadingManager.instance = new LoadingManager();
    }
    return LoadingManager.instance;
  }
}

// Add corresponding CSS to loading.css
const LOADING_STYLES = `
.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2147483646;
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.3s ease, visibility 0.3s ease;
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
}

.loading-overlay.show {
  opacity: 1;
  visibility: visible;
}

.loading-content {
  text-align: center;
  padding: var(--spacing-lg);
  background: rgba(255, 255, 255, 0.95);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  border: 1px solid var(--color-border);
  max-width: 280px;
  width: 90%;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--color-primary-500);
  border-right-color: transparent;
  border-radius: 50%;
  margin: 0 auto var(--spacing-md);
  animation: spin 0.8s linear infinite;
}

.loading-message {
  color: var(--color-text-primary);
  font-size: var(--font-size-sm);
  margin-bottom: var(--spacing-md);
}

.loading-progress {
  height: 4px;
  background: var(--color-surface-alt);
  border-radius: var(--radius-full);
  overflow: hidden;
}

.progress-bar {
  height: 100%;
  background: var(--color-primary-500);
  border-radius: var(--radius-full);
  width: 0;
  transition: width 0.3s ease-out;
}

.loading-overlay.fade-out {
  opacity: 0;
  visibility: hidden;
}

@media (prefers-color-scheme: dark) {
  .loading-overlay {
    background: rgba(0, 0, 0, 0.7);
  }

  .loading-content {
    background: rgba(28, 28, 30, 0.95);
  }

  .loading-spinner {
    border-color: var(--color-primary-500);
    border-right-color: transparent;
  }
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

[dir="rtl"] .loading-spinner {
  animation-direction: reverse;
}
`;

// Export styles for bundling
export const loadingStyles = LOADING_STYLES;

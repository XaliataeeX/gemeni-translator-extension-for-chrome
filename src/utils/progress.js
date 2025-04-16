/**
 * TranslationProgress Class
 * کلاس مدیریت نمایش پیشرفت ترجمه
 */
export class TranslationProgress {
  constructor() {
    this.progressEl = document.getElementById('translationProgress');
    this.progressText = document.getElementById('progressText');
    this.progressContainer = document.querySelector('.translation-progress');
    this.cancelBtn = document.getElementById('cancelTranslation');
    this.isCancelled = false;
    this.setupEventListeners();
  }

  setupEventListeners() {
    if (this.cancelBtn) {
      this.cancelBtn.addEventListener('click', () => {
        this.isCancelled = true;
        this.hide();
        // Emit cancel event
        window.dispatchEvent(new CustomEvent('translation-cancelled'));
      });
    }
  }

  show() {
    this.isCancelled = false;
    if (this.progressContainer) {
      this.progressContainer.classList.add('active');
    }
  }

  hide() {
    if (this.progressContainer) {
      this.progressContainer.classList.remove('active');
    }
  }

  updateProgress(percent) {
    if (this.progressEl) {
      this.progressEl.style.width = `${percent}%`;
    }
    if (this.progressText) {
      // Convert to Persian numerals for RTL languages
      const persianPercent = percent.toLocaleString('fa-IR');
      this.progressText.textContent = `${persianPercent}٪`;
    }
  }

  reset() {
    this.isCancelled = false;
    this.updateProgress(0);
  }

  isCancelRequested() {
    return this.isCancelled;
  }

  // Static instance getter
  static getInstance() {
    if (!TranslationProgress.instance) {
      TranslationProgress.instance = new TranslationProgress();
    }
    return TranslationProgress.instance;
  }
}
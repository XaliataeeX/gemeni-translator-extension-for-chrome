/**
 * سیستم راهنمای تعاملی برای کاربران جدید
 */
export class OnboardingGuide {
  constructor() {
    this.steps = [
      {
        element: '#languageSearch',
        title: 'جستجوی زبان',
        text: 'برای یافتن سریع زبان مورد نظر خود، از این قسمت استفاده کنید',
        position: 'bottom'
      },
      {
        element: '#targetLanguage',
        title: 'انتخاب زبان',
        text: 'زبان مقصد برای ترجمه را انتخاب کنید',
        position: 'bottom'
      },
      {
        element: '#swapDirectionBtn',
        title: 'تغییر جهت',
        text: 'برای تغییر جهت ترجمه از این دکمه استفاده کنید',
        position: 'right'
      },
      {
        element: '#translateBtn',
        title: 'ترجمه',
        text: 'پس از انتخاب متن در صفحه، روی این دکمه کلیک کنید یا از کلید میانبر Alt + T استفاده کنید',
        position: 'top'
      }
    ];
    
    this.currentStep = 0;
    this.tooltipElement = null;
  }

  init() {
    chrome.storage.local.get('onboarding_completed', (result) => {
      if (!result.onboarding_completed) {
        this.start();
      }
    });
  }

  start() {
    this.showStep(0);
    this.setupEventListeners();
  }

  showStep(index) {
    if (index >= this.steps.length) {
      this.complete();
      return;
    }

    const step = this.steps[index];
    const element = document.querySelector(step.element);
    if (!element) return;

    this.removeExistingTooltip();
    this.createTooltip(element, step);
    element.classList.add('highlight-element');
  }

  createTooltip(element, step) {
    const tooltip = document.createElement('div');
    tooltip.className = 'onboarding-tooltip animate-fade-in';
    tooltip.setAttribute('data-position', step.position);
    
    tooltip.innerHTML = `
      <div class="tooltip-content">
        <h3 class="tooltip-title">${step.title}</h3>
        <p class="tooltip-text">${step.text}</p>
        <div class="tooltip-actions">
          <button class="btn btn-sm btn-ghost" id="skipTutorial">رد کردن</button>
          <button class="btn btn-sm btn-primary" id="nextStep">بعدی</button>
        </div>
        <div class="tooltip-progress">
          ${this.currentStep + 1} از ${this.steps.length}
        </div>
      </div>
    `;

    document.body.appendChild(tooltip);
    this.positionTooltip(tooltip, element, step.position);
    this.tooltipElement = tooltip;

    // Event listeners
    tooltip.querySelector('#nextStep').addEventListener('click', () => {
      this.nextStep();
    });

    tooltip.querySelector('#skipTutorial').addEventListener('click', () => {
      this.complete();
    });
  }

  positionTooltip(tooltip, element, position) {
    const elementRect = element.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();
    
    let top, left;

    switch (position) {
      case 'top':
        top = elementRect.top - tooltipRect.height - 8;
        left = elementRect.left + (elementRect.width - tooltipRect.width) / 2;
        break;
      case 'bottom':
        top = elementRect.bottom + 8;
        left = elementRect.left + (elementRect.width - tooltipRect.width) / 2;
        break;
      case 'left':
        top = elementRect.top + (elementRect.height - tooltipRect.height) / 2;
        left = elementRect.left - tooltipRect.width - 8;
        break;
      case 'right':
        top = elementRect.top + (elementRect.height - tooltipRect.height) / 2;
        left = elementRect.right + 8;
        break;
    }

    // Ensure tooltip stays within viewport
    const viewport = {
      top: 0,
      left: 0,
      right: window.innerWidth,
      bottom: window.innerHeight
    };

    if (left < viewport.left) left = viewport.left + 8;
    if (left + tooltipRect.width > viewport.right) {
      left = viewport.right - tooltipRect.width - 8;
    }
    if (top < viewport.top) top = viewport.top + 8;
    if (top + tooltipRect.height > viewport.bottom) {
      top = viewport.bottom - tooltipRect.height - 8;
    }

    tooltip.style.top = `${top}px`;
    tooltip.style.left = `${left}px`;
  }

  nextStep() {
    const currentElement = document.querySelector(this.steps[this.currentStep].element);
    if (currentElement) {
      currentElement.classList.remove('highlight-element');
    }
    
    this.currentStep++;
    this.showStep(this.currentStep);
  }

  complete() {
    this.removeExistingTooltip();
    const highlightedElement = document.querySelector('.highlight-element');
    if (highlightedElement) {
      highlightedElement.classList.remove('highlight-element');
    }
    
    chrome.storage.local.set({ onboarding_completed: true });
  }

  removeExistingTooltip() {
    if (this.tooltipElement) {
      this.tooltipElement.remove();
      this.tooltipElement = null;
    }
  }

  setupEventListeners() {
    // Handle window resize
    window.addEventListener('resize', () => {
      if (this.tooltipElement) {
        const step = this.steps[this.currentStep];
        const element = document.querySelector(step.element);
        if (element) {
          this.positionTooltip(this.tooltipElement, element, step.position);
        }
      }
    });

    // Handle escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.complete();
      }
    });
  }

  static getInstance() {
    if (!OnboardingGuide.instance) {
      OnboardingGuide.instance = new OnboardingGuide();
    }
    return OnboardingGuide.instance;
  }
}
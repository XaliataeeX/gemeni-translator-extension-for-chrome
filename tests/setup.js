// Mock Chrome API
global.chrome = {
  runtime: {
    onMessage: {
      addListener: jest.fn(),
      removeListener: jest.fn()
    },
    sendMessage: jest.fn()
  },
  storage: {
    local: {
      get: jest.fn(),
      set: jest.fn()
    }
  },
  tabs: {
    query: jest.fn(),
    sendMessage: jest.fn()
  },
  scripting: {
    executeScript: jest.fn()
  }
};

// Mock fetch API
global.fetch = jest.fn();

// Mock performance API
global.performance = {
  now: jest.fn(() => Date.now()),
  memory: {
    usedJSHeapSize: 0,
    totalJSHeapSize: 100000000
  }
};

// Mock crypto API
global.crypto = {
  getRandomValues: jest.fn(array => {
    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
    return array;
  }),
  randomUUID: jest.fn(() => 'test-uuid')
};

// Mock DOM APIs
global.document = {
  createElement: jest.fn(tag => ({
    tagName: tag.toUpperCase(),
    className: '',
    style: {},
    dataset: {},
    appendChild: jest.fn(),
    remove: jest.fn(),
    classList: {
      add: jest.fn(),
      remove: jest.fn(),
      contains: jest.fn()
    },
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    querySelector: jest.fn(),
    querySelectorAll: jest.fn()
  })),
  getElementById: jest.fn(),
  body: {
    appendChild: jest.fn(),
    removeChild: jest.fn()
  }
};

// Mock window API
global.window = {
  getSelection: jest.fn(() => ({
    toString: () => 'test selection',
    getRangeAt: () => ({
      getBoundingClientRect: () => ({
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
        width: 100,
        height: 20
      })
    })
  }))
};

// Reset all mocks before each test
beforeEach(() => {
  jest.clearAllMocks();

  // Reset storage mock implementation
  chrome.storage.local.get.mockImplementation((key) => {
    const defaults = {
      gemini_api_key: 'test-api-key',
      target_language: 'fa',
      app_settings: {
        translationDirection: 'to_persian'
      }
    };
    return Promise.resolve({ [key]: defaults[key] });
  });

  // Reset fetch mock implementation
  fetch.mockImplementation(() => 
    Promise.resolve({
      ok: true,
      json: () => Promise.resolve({
        candidates: [{
          content: {
            parts: [{
              text: 'translated text'
            }]
          }
        }]
      })
    })
  );
});

// Cleanup after each test
afterEach(() => {
  jest.restoreAllMocks();
});
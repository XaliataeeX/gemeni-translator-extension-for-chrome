# Gemini Translator Chrome Extension

A fast, efficient Chrome extension for instant text translation using the Gemini AI API. This extension focuses on core translation functionality with optimal performance and clean design.

## Features

- 🚀 Instant text selection translation
- 🔄 Bidirectional translation (English ↔ Persian/Other languages)
- 💾 Translation caching for improved performance
- 🎯 Minimalist, distraction-free interface
- 🌐 RTL language support
- ⌨️ Keyboard shortcuts
- 🔒 Secure API key management

## Getting Started

### Prerequisites

- Node.js 16.x or higher
- Chrome browser
- Gemini API key

### Installation

1. Clone the repository
2. Install dependencies:
```bash
npm install
```
3. Build the extension:
```bash
npm run build
```
4. Load the extension in Chrome:
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked" and select the `dist` folder

### Development

Start development server with hot reload:
```bash
npm run dev
```

Run tests:
```bash
npm test
```

Build for production:
```bash
npm run build
```

## Usage

1. Click the extension icon to open the popup
2. Enter your Gemini API key in the settings
3. Select text on any webpage
4. Click the translate button or use the shortcut (Ctrl/Cmd + Enter)

### Keyboard Shortcuts

- `Ctrl/Cmd + Enter`: Translate selected text
- `Esc`: Close translation popup

## Architecture

The extension follows a modular architecture with clean separation of concerns:

- `src/services`: Core business logic
- `src/utils`: Utility functions
- `src/types`: TypeScript definitions
- `src/styles`: Shared styles
- `popup/`: Extension popup UI
- `content/`: Content script for webpage integration
- `background/`: Background service worker

## Performance Optimizations

- Translation caching
- Request rate limiting
- Progressive loading for large texts
- Optimized bundle size
- Memory usage monitoring
- Efficient DOM updates

## Security Features

- Secure API key storage
- Input sanitization
- Content Security Policy
- Rate limiting protection
- Error handling and validation

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Gemini AI API for translation services
- Chrome Extension APIs
- Contributors and users

## Support

For support, please open an issue in the GitHub repository.

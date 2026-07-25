# 🤖 GyaanBot - AI Voice Assistant

> Your intelligent voice assistant with continuous listening and AI-powered answers

![Version](https://img.shields.io/badge/version-1.0-blue)
![Status](https://img.shields.io/badge/status-active-success)
![Mobile](https://img.shields.io/badge/mobile-responsive-green)


## ✨ Features

- 🎤 **Continuous Voice Recognition** - No need to click repeatedly
- 🤖 **AI-Powered Answers** - Get instant answers using Gemini API
- 🌐 **Works Everywhere** - Chrome extension runs on any website
- 📱 **Mobile Responsive** - Perfect UI on all devices
- ⌨️ **Keyboard Shortcut** - Ctrl+Shift+J to activate
- 🔄 **Auto-Restart** - Watchdog ensures mic never stops
- 🎨 **Beautiful UI** - Floating button with smooth animations

## 🚀 Quick Start

### Method 1: Chrome Extension (Recommended)

1. Download or clone this repository
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" (top-right toggle)
4. Click "Load unpacked" and select the project folder
5. Press `Ctrl+Shift+J` on any website to activate!

### Method 2: Standalone Webpage

1. Open `index.html` in your browser
2. Allow microphone access
3. Click the mic button and start speaking

## 🎤 Voice Commands

| Category | Command Example | Action |
|----------|----------------|--------|
| **AI Questions** | "What is AI?" | Gets AI-powered answer |
| **Navigation** | "Open YouTube" | Opens websites |
| **Music** | "Play music" | Plays your favorite songs |
| **Information** | "Time", "Date" | Gets current info |
| **Control** | "Stop listening" | Deactivates bot |

**20+ total commands available!**

## 🔧 Setup AI Answers (Optional)

To enable AI-powered responses:

1. Get free API key from: https://makersuite.google.com/app/apikey
2. Open `content.js`
3. Replace `YOUR_GEMINI_API_KEY` with your actual key
4. Reload the extension

Without API key, questions will open Google search instead.

## 📱 Mobile Support

Fully responsive design works perfectly on:
- 📱 Smartphones (iPhone, Android)
- 📲 Tablets (iPad, etc.)
- 💻 Desktop (All screen sizes)

## 🛠️ Tech Stack

- **Voice Recognition:** Web Speech API
- **AI:** Google Gemini API
- **Extension:** Chrome Manifest V3
- **Styling:** Vanilla CSS with responsive design
- **Icons:** Font Awesome

## 📂 Project Structure

```
Jarvis/
├── manifest.json          # Chrome extension config
├── content.js             # Main voice recognition logic
├── background.js          # Service worker
├── style.css              # Responsive styles
├── popup.html             # Extension popup
├── index.html             # Standalone version
└── README.md              # Documentation
```

## 🤝 Contributing

Contributions welcome! Feel free to:
- 🐛 Report bugs
- 💡 Suggest features
- 🔧 Submit pull requests

## 📄 License

MIT License - Feel free to use and modify!

## 👨‍💻 Author

**Anshraj**
- GitHub: [@Anshraj11111](https://github.com/Anshraj11111)

---

⭐ **Star this repo if you found it helpful!**

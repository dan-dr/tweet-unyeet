# Tweet Unyeet

A Chrome extension that saves tweets you've actually scrolled past on your X home timeline — so you can find them again if they disappear.

## Features

- Saves tweets only after they enter your viewport (not everything in the DOM)
- Home timeline only — scoped to your primary feed column
- Detects your timeline tabs (For you, Following, pinned lists) and lets you choose which to save from
- Timeline badge on each saved tweet showing where you saw it
- Fuzzy search by author, content, or timeline name
- Configurable retention limit (default: 100 tweets)

## Install

1. Clone this repository
2. Open `chrome://extensions` in Chrome
3. Enable **Developer mode**
4. Click **Load unpacked** and select this folder

## Usage

1. Visit [x.com/home](https://x.com/home) and scroll your timeline
2. Open the extension popup to configure which timelines to save and browse/search saved tweets

## Development

No build step — plain Manifest V3 extension:

| File | Purpose |
|------|---------|
| `manifest.json` | Extension manifest |
| `content.js` | Timeline detection, viewport tracking, storage |
| `popup.html` / `popup.js` / `popup.css` | Popup UI |
| `icon48.png` / `icon128.png` | Extension icons |

## Privacy

All data stays in your browser via `chrome.storage.local`. Nothing is sent to any server.
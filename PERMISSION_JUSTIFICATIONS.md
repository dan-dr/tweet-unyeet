# Permission Justifications — Tweet Unyeet

Copy these into the Chrome Web Store developer dashboard when submitting.

## `storage`

> This extension uses `chrome.storage.local` to persist saved tweets, user settings (max tweet count, enabled timelines), and detected timeline tabs locally on the user's device. Saved tweet data includes author name, tweet text, URL, and which home timeline tab the tweet was viewed on. This data never leaves the user's browser and is not transmitted to any external service. Without this permission, the extension could not remember saved tweets or user preferences between browser sessions.

## Host access: `https://x.com/*` and `https://twitter.com/*` (content script)

> The content script runs only on X/Twitter pages so it can detect when the user is on the home timeline (`/home`), observe tweets entering the viewport, and read tweet author, text, and status URL from the page DOM. It does not run on other websites. The extension does not modify page content or inject ads. Host access is limited to X/Twitter domains because that is the only site this extension is designed to work with.

## Single purpose

> Tweet Unyeet has one purpose: save tweets the user has scrolled past on their X home timeline for later reference.

## Data use certification (dashboard form)

- **Does your extension collect user data?** Yes — tweet text, author display name, tweet URL, and timeline tab label, stored locally only.
- **Is data sold or used for unrelated purposes?** No.
- **Is data transmitted off-device?** No.
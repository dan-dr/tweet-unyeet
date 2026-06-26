# Permission Justifications — Tweet Unyeet

Copy these into the Chrome Web Store developer dashboard when submitting.

## `storage`

> This extension uses `chrome.storage.local` to persist saved tweets, user settings (max tweet count, enabled timelines), and detected timeline tabs locally on the user's device. Saved tweet data includes author name, tweet text, URL, and which home timeline tab the tweet was viewed on. This data never leaves the user's browser and is not transmitted to any external service. Without this permission, the extension could not remember saved tweets or user preferences between browser sessions.

## Host access: `https://x.com/*` and `https://twitter.com/*` (content script)

> The content script runs only on X/Twitter pages so it can detect when the user is on the home timeline (`/home`), observe tweets entering the viewport, and read tweet author, text, and status URL from the page DOM. It does not run on other websites. The extension does not modify page content or inject ads. Host access is limited to X/Twitter domains because that is the only site this extension is designed to work with.

## Single purpose

> Tweet Unyeet has one purpose: save tweets the user has scrolled past on their X home timeline for later reference.

## Remote code

**Select:** `No, I am not using remote code`

If a justification field still appears:

> This extension does not execute remotely hosted code. All JavaScript (content.js, popup.js) is bundled in the extension package. The extension does not use eval(), does not load external scripts, and does not fetch executable code from any server.

## Data use certification (Privacy practices tab)

**Data collected — check these:**
- Website content (tweet text and author display names read from X pages)
- Web browsing activity (limited to detecting x.com/twitter.com home timeline and which tab is active)

**Do NOT check:** health, financial, authentication, location, personal communications, etc.

**Certifications — check all that apply:**
- Data is not sold to third parties
- Data is not used for purposes unrelated to the extension's single purpose
- Data is not used for creditworthiness or lending purposes
- Data is not used for personalized advertising
- You comply with the Limited Use policy

**Privacy policy URL:**
https://dan-dr.github.io/tweet-unyeet/privacy-policy.html

## Publisher contact email (Settings page)

1. Go to [Developer Dashboard](https://chrome.google.com/webstore/devconsole) → **Settings** (gear icon or Publisher settings)
2. Enter your contact email
3. Click the verification link Google sends to that inbox
4. Return and publish
# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Workflow

No build step or package manager. This is a plain JS Chrome extension (Manifest V3).

**To test changes:**
1. Go to `chrome://extensions/` in Chrome
2. Enable Developer mode
3. Click "Load unpacked" and select this folder (first time), or click the reload button on the extension card (after changes)
4. For background script changes, click the "service worker" link to open DevTools for the background context
5. For popup changes, right-click the extension popup → Inspect

## Architecture

Three isolated JS contexts that communicate via `chrome.storage.local` and `chrome.runtime.sendMessage`:

- **`background.js` (`BackgroundManager`)** — Service worker. Owns time tracking. Runs a 1-second interval to increment `sessionTime`, a 30-second interval to flush session time into `todayStats`/`totalStats`, and a 5-minute interval to trigger Firebase sync via a message to the popup. Does not directly write to Firebase (popup must be open for sync).

- **`content.js` (`InstagramTracker`)** — Injected into `instagram.com`. Polls `location.href` every 500ms to detect SPA navigation. On reel URL change, increments reel counts directly in `chrome.storage.local` (bypasses background script entirely).

- **`popup.js` (`PopupManager`)** — Handles UI, Google OAuth via `chrome.identity`, and all Firebase reads/writes. Waits for `window.firebaseAuth` / `window.firebaseDb` globals set by `firebase-config.js` before initializing.

- **`firebase-config.js`** — Initializes Firebase using the local bundled SDK in `firebase/`. Exposes Firestore functions (`getDoc`, `setDoc`, `updateDoc`, `increment`, `doc`) and the db/auth instances as globals on `window`.

## Key Data Model Notes

`totalStats` is intentionally a **daily mirror** of `todayStats`, not a cumulative all-time total. Both reset when the date changes. This is set explicitly in `syncTotalWithToday()` which runs in both background and popup.

```javascript
// chrome.storage.local schema
{
  currentSession: { time: 0, reels: 0, isActive: true },
  todayStats:     { date: "Mon Dec 16 2024", time: 318, reels: 21 },
  totalStats:     { time: 318, reels: 21 }  // mirrors todayStats
}
```

## Firebase Sync Caveat

The background script's `syncWithFirebase()` method sends a `sync_data` message to the popup to do the actual Firestore write. If the popup is closed, the sync silently no-ops. Firebase data is only written while the popup is open.

## Authentication

Uses `chrome.identity.getAuthToken()` (Chrome Identity API), not Firebase Auth. The token is used to fetch user info from Google's OAuth2 userinfo endpoint. User data is stored in `chrome.storage.local` as `currentUser`.

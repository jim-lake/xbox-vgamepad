import { MSG_SOURCE } from '@/types/messages';
import type { ExtensionMessage } from '@/types/messages';

// Notify background that content script loaded
try {
  void chrome.runtime.sendMessage({ source: MSG_SOURCE, type: 'INJECTED' });
} catch {
  // Extension context invalidated
}

// Relay messages from page → background
window.addEventListener('message', (event: MessageEvent) => {
  const data: unknown = event.data;
  if (
    !data ||
    typeof data !== 'object' ||
    (data as { source?: unknown }).source !== MSG_SOURCE
  ) {
    return;
  }
  const msg = data as ExtensionMessage;
  if (msg.type === 'INITIALIZED') {
    try {
      chrome.runtime.sendMessage(
        msg,
        (response: ExtensionMessage | undefined) => {
          if (chrome.runtime.lastError) {
            return;
          }
          if (response) {
            window.postMessage(response, '*');
          }
        }
      );
    } catch {
      // Extension context invalidated
    }
  } else if (msg.type === 'GAME_CHANGED') {
    try {
      void chrome.runtime.sendMessage(msg);
    } catch {
      // Extension context invalidated
    }
  } else if (msg.type === 'SET_OVERLAY_MINIMIZED') {
    try {
      void chrome.storage.sync.set({ OVERLAY_MINIMIZED: msg.minimized });
    } catch {
      // Extension context invalidated
    }
  }
});

// Relay messages from background/popup → page
chrome.runtime.onMessage.addListener((message: ExtensionMessage, sender) => {
  // Only process messages from background/popup (not from other tabs)
  if (sender.tab) {
    return;
  }
  window.postMessage({ ...message, source: MSG_SOURCE }, '*');
});

// On DOMContentLoaded: pass resource URLs to the page via a meta tag
document.addEventListener('DOMContentLoaded', () => {
  const meta = document.createElement('meta');
  meta.name = 'xvg-resources';
  meta.content = JSON.stringify({
    icon: chrome.runtime.getURL('src/assets/img/icon48.png'),
  });
  document.head.appendChild(meta);
});

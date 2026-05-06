import { MSG_SOURCE } from '@/types/messages';
import type { ExtensionMessage } from '@/types/messages';

// Inject the page-context script immediately (before DOM is ready)
const script = document.createElement('script');
script.src = chrome.runtime.getURL('src/injected/index.js');
script.type = 'module';
document.documentElement.appendChild(script);
script.remove();

// Notify background that content script loaded
try {
  chrome.runtime.sendMessage({ source: MSG_SOURCE, type: 'INJECTED' });
} catch {
  // Extension context invalidated
}

// Relay messages from page → background
window.addEventListener('message', (event: MessageEvent) => {
  const data = event.data as ExtensionMessage | undefined;
  if (!data || data.source !== MSG_SOURCE) {
    return;
  }
  if (data.type === 'INITIALIZED') {
    try {
      chrome.runtime.sendMessage(data, (response: ExtensionMessage | undefined) => {
        if (chrome.runtime.lastError) {
          return;
        }
        if (response) {
          window.postMessage(response, '*');
        }
      });
    } catch {
      // Extension context invalidated
    }
  } else if (data.type === 'GAME_CHANGED') {
    try {
      chrome.runtime.sendMessage(data);
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

// On DOMContentLoaded: inject CSS and pass resource URLs
document.addEventListener('DOMContentLoaded', () => {
  // Pass extension resource URLs to the page via a meta tag
  const meta = document.createElement('meta');
  meta.name = 'xvg-resources';
  meta.content = JSON.stringify({
    icon: chrome.runtime.getURL('src/assets/img/icon48.png'),
  });
  document.head.appendChild(meta);
});

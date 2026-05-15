// Install co-op patch FIRST — must be before any other imports that might
// delay execution. This is a side-effect import that sets up the webpack
// chunk interceptor synchronously during module evaluation.
import './coop-patch';

import { MSG_SOURCE } from '@/types/messages';
import type { ExtensionMessage } from '@/types/messages';
import type { GamepadConfig } from '@/types/gamepad';
import { detectGame, getGameName } from './game-detection';
import * as inputProcessor from './input-processor';
import { showToast } from './toast';

// Patch getGamepads immediately (module side-effect via import)
import './gamepad-simulator';

const POLL_INTERVAL = 1000;

let pollTimer: ReturnType<typeof setInterval> | null = null;
let pendingConfig: { name: string; gamepadConfig: GamepadConfig } | null = null;

function sendMessage(msg: ExtensionMessage): void {
  window.postMessage(msg, '*');
}

function applyPendingConfig(): void {
  if (!pendingConfig) {
    return;
  }
  const { name, gamepadConfig } = pendingConfig;
  pendingConfig = null;
  updateToggleCodes(gamepadConfig);
  showToast(`'${name}' preset activated`);
  inputProcessor.activate(gamepadConfig, { resetDismissed: true });
}

function handleMessage(msg: ExtensionMessage): void {
  if (msg.type === 'ACTIVATE_GAMEPAD_CONFIG') {
    const activateMsg = msg;
    updateToggleCodes(activateMsg.gamepadConfig);
    showToast(`'${activateMsg.name}' preset activated`);
    inputProcessor.activate(
      activateMsg.gamepadConfig,
      activateMsg.overlayMinimized !== undefined
        ? { overlayMinimized: activateMsg.overlayMinimized }
        : undefined
    );
  } else if (msg.type === 'CONFIG_CHANGED') {
    pendingConfig = { name: msg.name, gamepadConfig: msg.gamepadConfig };
    if (document.hasFocus()) {
      applyPendingConfig();
    }
  } else if (msg.type === 'DISABLE_GAMEPAD') {
    if (inputProcessor.isActive()) {
      showToast('Mouse/keyboard disabled');
    }
    inputProcessor.deactivate();
  }
}

// Global toggle listener (works regardless of active state, uses config-driven keys)
let toggleCodes: Set<string> = new Set(['F9']);
// Map from key code → set of toggle action names bound to it
let toggleCodeActions = new Map<string, Set<string>>();

function updateToggleCodes(config: GamepadConfig): void {
  const codeActions = new Map<string, Set<string>>();
  for (const [code, entries] of Object.entries(config.keyboardConfig)) {
    for (const e of entries) {
      if (
        e.type === 'action' &&
        (e.action === 'toggleGamepad' ||
          e.action === 'toggleAllGamepads' ||
          e.action === 'toggleExtension')
      ) {
        let set = codeActions.get(code);
        if (!set) {
          set = new Set();
          codeActions.set(code, set);
        }
        // For toggleGamepad, encode the index so we know which pad to toggle
        set.add(
          e.action === 'toggleGamepad'
            ? `toggleGamepad:${String(e.gamepadIndex)}`
            : e.action
        );
      }
    }
  }
  toggleCodes = new Set(codeActions.keys());
  toggleCodeActions = codeActions;
}

document.addEventListener(
  'keydown',
  (e: KeyboardEvent) => {
    if (e.repeat || !toggleCodes.has(e.code)) {
      return;
    }
    const actions = toggleCodeActions.get(e.code);
    if (actions) {
      for (const action of actions) {
        if (action === 'toggleAllGamepads') {
          inputProcessor.toggleAllGamepads();
        } else if (action === 'toggleExtension') {
          sendMessage({
            source: MSG_SOURCE,
            type: 'TOGGLE_ENABLED',
            enabled: !inputProcessor.isActive(),
          });
        } else if (action.startsWith('toggleGamepad:')) {
          const idx = Number(action.slice('toggleGamepad:'.length)) as
            | 0
            | 1
            | 2
            | 3;
          inputProcessor.toggleGamepadIndex(idx);
        }
      }
    }
    if (e.cancelable) {
      e.preventDefault();
    }
  },
  true
);

function startWaitingForGame(): void {
  if (pollTimer !== null) {
    clearInterval(pollTimer);
  }
  pollTimer = setInterval(() => {
    if (detectGame()) {
      if (pollTimer !== null) {
        clearInterval(pollTimer);
        pollTimer = null;
      }
      onGameDetected();
    }
  }, POLL_INTERVAL);
  // Check immediately
  if (detectGame()) {
    clearInterval(pollTimer);
    pollTimer = null;
    onGameDetected();
  }
}

function onGameDetected(): void {
  const gameName = getGameName();

  // Listen for responses from content script
  window.addEventListener('message', onWindowMessage);

  // Send INITIALIZED — if content script is already listening, it relays immediately.
  // If not, it will send CONTENT_READY when ready, and we re-send.
  sendMessage({ source: MSG_SOURCE, type: 'INITIALIZED', gameName });

  let currentGameName = gameName;

  // Poll for game exit or game name change
  pollTimer = setInterval(() => {
    if (!detectGame()) {
      if (pollTimer !== null) {
        clearInterval(pollTimer);
        pollTimer = null;
      }
      inputProcessor.deactivate();
      sendMessage({ source: MSG_SOURCE, type: 'GAME_CHANGED', gameName: null });
      window.removeEventListener('message', onWindowMessage);
      startWaitingForGame();
    } else {
      const newGameName = getGameName();
      if (newGameName !== currentGameName) {
        currentGameName = newGameName;
        sendMessage({
          source: MSG_SOURCE,
          type: 'GAME_CHANGED',
          gameName: newGameName,
        });
      }
    }
  }, POLL_INTERVAL);
}

function onWindowMessage(event: MessageEvent): void {
  const data: unknown = event.data;
  if (
    !data ||
    typeof data !== 'object' ||
    (data as { source?: unknown }).source !== MSG_SOURCE
  ) {
    return;
  }
  const msg = data as ExtensionMessage;
  if (
    msg.type === 'ACTIVATE_GAMEPAD_CONFIG' ||
    msg.type === 'CONFIG_CHANGED' ||
    msg.type === 'DISABLE_GAMEPAD'
  ) {
    handleMessage(msg);
  } else if (msg.type === 'CONTENT_READY') {
    // Content script just loaded — re-send INITIALIZED so it can relay to background
    sendMessage({
      source: MSG_SOURCE,
      type: 'INITIALIZED',
      gameName: getGameName(),
    });
  }
}

// Handle bfcache
window.addEventListener('pageshow', () => {
  startWaitingForGame();
});

// Apply pending config when window gains focus
window.addEventListener('focus', () => {
  applyPendingConfig();
});

startWaitingForGame();

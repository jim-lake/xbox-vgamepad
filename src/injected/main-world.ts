import { MSG_SOURCE } from '@/types/messages';
import type { ExtensionMessage } from '@/types/messages';
import type { GamepadConfig } from '@/types/gamepad';
import { detectGame, getGameName } from './game-detection';
import { inputProcessor } from './input-processor';
import { showToast } from './toast';

// Patch getGamepads immediately (module side-effect via import)
import './gamepad-simulator';

const POLL_INTERVAL = 1000;

let pollTimer: ReturnType<typeof setInterval> | null = null;
let lastConfigName: string | null = null;

function sendMessage(msg: ExtensionMessage): void {
  window.postMessage(msg, '*');
}

function handleMessage(msg: ExtensionMessage): void {
  if (msg.type === 'ACTIVATE_GAMEPAD_CONFIG') {
    const activateMsg = msg;
    lastConfigName = activateMsg.name;
    updateToggleCodes(activateMsg.gamepadConfig);
    showToast(`'${activateMsg.name}' preset activated`);
    inputProcessor.activate(
      activateMsg.gamepadConfig,
      activateMsg.overlayMinimized !== undefined
        ? { overlayMinimized: activateMsg.overlayMinimized }
        : undefined
    );
  } else if (msg.type === 'DISABLE_GAMEPAD') {
    if (inputProcessor.isActive()) {
      showToast('Mouse/keyboard disabled');
    }
    inputProcessor.deactivate();
  }
}

// Global toggle listener (works regardless of active state, uses config-driven keys)
let toggleCodes: Set<string> = new Set(['F9']);

function updateToggleCodes(config: GamepadConfig): void {
  const val = config.keyConfig.toggleGamepad;
  if (val === undefined) {
    toggleCodes = new Set();
  } else if (typeof val === 'string') {
    toggleCodes = new Set([val]);
  } else {
    toggleCodes = new Set(val);
  }
}

document.addEventListener(
  'keydown',
  (e: KeyboardEvent) => {
    if (!e.repeat && toggleCodes.has(e.code)) {
      inputProcessor.toggle();
      if (inputProcessor.isActive()) {
        showToast(`'${lastConfigName ?? 'default'}' reconnected`);
      } else {
        showToast('Gamepad disconnected');
      }
      if (e.cancelable) {
        e.preventDefault();
      }
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
  sendMessage({ source: MSG_SOURCE, type: 'INITIALIZED', gameName });

  // Listen for responses from content script
  window.addEventListener('message', onWindowMessage);

  // Poll for game exit
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
    msg.type === 'DISABLE_GAMEPAD'
  ) {
    handleMessage(msg);
  }
}

// Handle bfcache
window.addEventListener('pageshow', () => {
  startWaitingForGame();
});

startWaitingForGame();

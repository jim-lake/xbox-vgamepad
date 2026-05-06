import { MSG_SOURCE } from '@/types/messages';
import type {
  ExtensionMessage,
  ActivateGamepadConfigMessage,
} from '@/types/messages';
import { detectGame, getGameName } from './game-detection';
import { inputProcessor } from './input-processor';
import { showToast } from './toast';

// Patch getGamepads immediately (module side-effect via import)
import './gamepad-simulator';

const POLL_INTERVAL = 1000;

let pollTimer: ReturnType<typeof setInterval> | null = null;

function sendMessage(msg: ExtensionMessage): void {
  window.postMessage(msg, '*');
}

function handleMessage(msg: ExtensionMessage): void {
  if (msg.type === 'ACTIVATE_GAMEPAD_CONFIG') {
    const activateMsg = msg;
    showToast(`'${activateMsg.name}' preset activated`);
    inputProcessor.activate(activateMsg.gamepadConfig);
  } else if (msg.type === 'DISABLE_GAMEPAD') {
    if (inputProcessor.isActive()) {
      showToast('Mouse/keyboard disabled');
    }
    inputProcessor.deactivate();
  }
}

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
    if (pollTimer !== null) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
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
  const data = event.data as ExtensionMessage | undefined;
  if (!data || data.source !== MSG_SOURCE) {
    return;
  }
  if (
    data.type === 'ACTIVATE_GAMEPAD_CONFIG' ||
    data.type === 'DISABLE_GAMEPAD'
  ) {
    handleMessage(data);
  }
}

// Handle bfcache
window.addEventListener('pageshow', () => {
  startWaitingForGame();
});

startWaitingForGame();

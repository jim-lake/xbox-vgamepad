// Install co-op patch FIRST — must be before any other imports that might
// delay execution. This is a side-effect import that sets up the webpack
// chunk interceptor synchronously during module evaluation.
import './coop-patch';

import { MSG_SOURCE, isExtensionMessage } from '@/types/messages';
import type {
  ExtensionMessage,
  SettingsChangedMessage,
} from '@/types/messages';
import type { GamepadConfig } from '@/types/gamepad';
import { detectGame, getGameName } from './game-detection';
import * as inputProcessor from './input-processor';
import { showToast } from './toast';
import { debugLog, log, setLoggingEnabled } from '../tools/log';

import './gamepad-simulator';

// Blur suppression — always registered with capture, controlled by flag
let g_disableBlur = false;
let g_autoSuspendOnInput = true;
window.addEventListener(
  'blur',
  (e: Event) => {
    if (g_disableBlur) {
      e.stopImmediatePropagation();
      e.preventDefault();
    }
  },
  true
);

// Fake fullscreen — intercept requestFullscreen/exitFullscreen
let g_fakeFullscreen = false;
// eslint-disable-next-line @typescript-eslint/unbound-method
const realRequestFullscreen = Element.prototype.requestFullscreen;
const realExitFullscreen = () =>
  Document.prototype.exitFullscreen.call(document);
Element.prototype.requestFullscreen = function (
  options?: FullscreenOptions
): Promise<void> {
  if (g_fakeFullscreen) {
    log('[gamepad]: requestFullscreen intercepted (blocked/faked)');
    Object.defineProperty(document, 'fullscreenElement', {
      value: this,
      writable: true,
      configurable: true,
    });
    document.dispatchEvent(new Event('fullscreenchange'));
    return Promise.resolve();
  }
  log('[gamepad]: requestFullscreen passthrough');
  return realRequestFullscreen.call(this, options);
};
document.exitFullscreen = function (): Promise<void> {
  if (g_fakeFullscreen) {
    log('[gamepad]: exitFullscreen intercepted (blocked/faked)');
    Object.defineProperty(document, 'fullscreenElement', {
      value: null,
      writable: true,
      configurable: true,
    });
    document.dispatchEvent(new Event('fullscreenchange'));
    return Promise.resolve();
  }
  log('[gamepad]: exitFullscreen passthrough');
  return realExitFullscreen();
};

let g_gameActive = false;

function handleSettingsChanged(msg: SettingsChangedMessage): void {
  setLoggingEnabled(msg.enableLogging);
  localStorage.setItem(
    'xvg-enableLogging',
    msg.enableLogging ? 'true' : 'false'
  );
  g_disableBlur = msg.disableBlur;
  localStorage.setItem(
    'xvg-patchRemoteMultigamepad',
    msg.patchRemoteMultigamepad ? 'true' : 'false'
  );
  g_autoSuspendOnInput = msg.autoSuspendOnInput;
}

window.addEventListener('message', (event: MessageEvent) => {
  const data: unknown = event.data;
  if (!isExtensionMessage(data)) {
    return;
  }
  if (data.type === 'SETTINGS_CHANGED') {
    handleSettingsChanged(data);
  } else if (g_gameActive) {
    handleGameMessage(data);
  }
});

debugLog(
  '[gamepad]: Load main-world, logging enabled:',
  String(localStorage.getItem('xvg-enableLogging'))
);

const POLL_INTERVAL = 1000;

let pollTimer: ReturnType<typeof setInterval> | null = null;
let pendingConfig: { name: string; gamepadConfig: GamepadConfig } | null = null;
let g_activePresetName = 'default';

function sendMessage(msg: ExtensionMessage): void {
  window.postMessage(msg, '*');
}

function applyPendingConfig(): void {
  if (!pendingConfig) {
    return;
  }
  const { name, gamepadConfig } = pendingConfig;
  pendingConfig = null;
  g_activePresetName = name;
  updateToggleCodes(gamepadConfig);
  showToast(`'${name}' preset activated`);
  inputProcessor.activate(gamepadConfig, { resetDismissed: true });
}

function handleMessage(msg: ExtensionMessage): void {
  if (msg.type === 'ACTIVATE_GAMEPAD_CONFIG') {
    const activateMsg = msg;
    g_activePresetName = activateMsg.name;
    g_fakeFullscreen = activateMsg.gamepadConfig.fakeFullscreen === true;
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
    g_fakeFullscreen = msg.gamepadConfig.fakeFullscreen === true;
    if (document.hasFocus()) {
      applyPendingConfig();
    }
  } else if (msg.type === 'DISABLE_GAMEPAD') {
    g_fakeFullscreen = false;
    if (inputProcessor.isActive()) {
      showToast('Mouse/keyboard disabled');
    }
    inputProcessor.deactivate();
  }
}

let toggleCodes: Set<string> = new Set(['F9']);
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
      sendMessage({
        source: MSG_SOURCE,
        type: 'GAMEPAD_STATUS',
        connected: inputProcessor.getConnectedStatus(),
      });
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
  if (detectGame()) {
    clearInterval(pollTimer);
    pollTimer = null;
    onGameDetected();
  }
}

function onGameDetected(): void {
  const gameName = getGameName();

  g_gameActive = true;

  // Send INITIALIZED — if content script is already listening, it relays immediately.
  // If not, it will send CONTENT_READY when ready, and we re-send.
  sendMessage({ source: MSG_SOURCE, type: 'INITIALIZED', gameName });

  let currentGameName = gameName;

  pollTimer = setInterval(() => {
    if (!detectGame()) {
      if (pollTimer !== null) {
        clearInterval(pollTimer);
        pollTimer = null;
      }
      g_gameActive = false;
      inputProcessor.deactivate();
      sendMessage({ source: MSG_SOURCE, type: 'GAME_CHANGED', gameName: null });
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

function handleGameMessage(msg: ExtensionMessage): void {
  if (
    msg.type === 'ACTIVATE_GAMEPAD_CONFIG' ||
    msg.type === 'CONFIG_CHANGED' ||
    msg.type === 'DISABLE_GAMEPAD'
  ) {
    handleMessage(msg);
  } else if (msg.type === 'POPUP_OPENED') {
    if (g_autoDisabled) {
      g_autoDisabled = false;
      g_suspendSuppressed = true;
      inputProcessor.resume();
      sendMessage({
        source: MSG_SOURCE,
        type: 'INPUT_SUSPENDED',
        suspended: false,
      });
      showToast(`'${g_activePresetName}' resumed`);
    }
    inputProcessor.restoreOverlayIfDismissed();
    sendMessage({
      source: MSG_SOURCE,
      type: 'GAMEPAD_STATUS',
      connected: inputProcessor.getConnectedStatus(),
    });
  } else if (msg.type === 'TOGGLE_GAMEPAD') {
    inputProcessor.toggleGamepadIndex(msg.gamepadIndex);
    sendMessage({
      source: MSG_SOURCE,
      type: 'GAMEPAD_STATUS',
      connected: inputProcessor.getConnectedStatus(),
    });
  } else if (msg.type === 'CONTENT_READY') {
    // Content script just loaded — re-send INITIALIZED so it can relay to background
    sendMessage({
      source: MSG_SOURCE,
      type: 'INITIALIZED',
      gameName: getGameName(),
    });
  }
}

// Auto-disable gamepad when a visible text input appears
const TEXT_INPUT_SELECTOR =
  'input:not([type="hidden"]):not([type="radio"]):not([type="checkbox"]):not([type="submit"]):not([type="button"]), textarea, [contenteditable="true"], [role="textbox"]';

let g_autoDisabled = false;
let g_suspendSuppressed = false;

function findVisibleTextInput(): Element | null {
  return (
    Array.from(document.querySelectorAll(TEXT_INPUT_SELECTOR)).find(
      (el) =>
        (el as HTMLElement).offsetWidth > 0 &&
        (el as HTMLElement).offsetHeight > 0 &&
        window.getComputedStyle(el).visibility !== 'hidden' &&
        window.getComputedStyle(el).display !== 'none'
    ) || null
  );
}

function checkTextInputState(): void {
  if (!g_autoSuspendOnInput) {
    return;
  }
  const visible = findVisibleTextInput();
  if (
    visible &&
    !g_autoDisabled &&
    !g_suspendSuppressed &&
    inputProcessor.isActive()
  ) {
    g_autoDisabled = true;
    inputProcessor.suspend();
    sendMessage({
      source: MSG_SOURCE,
      type: 'INPUT_SUSPENDED',
      suspended: true,
    });
    showToast('Keyboard/Mouse suspended for text input');
    log('[gamepad]: Auto-disabled — text input detected');
  } else if (!visible && g_autoDisabled) {
    g_autoDisabled = false;
    inputProcessor.resume();
    sendMessage({
      source: MSG_SOURCE,
      type: 'INPUT_SUSPENDED',
      suspended: false,
    });
    showToast(`'${g_activePresetName}' resumed`);
    log('[gamepad]: Auto-re-enabled — text input removed');
  } else if (!visible && g_suspendSuppressed) {
    g_suspendSuppressed = false;
  }
}

new MutationObserver(checkTextInputState).observe(document.documentElement, {
  childList: true,
  subtree: true,
  attributes: true,
  attributeFilter: [
    'style',
    'class',
    'type',
    'hidden',
    'contenteditable',
    'role',
  ],
});

// Handle bfcache
window.addEventListener('pageshow', () => {
  startWaitingForGame();
});

window.addEventListener('focus', () => {
  if (g_gameActive) {
    applyPendingConfig();
  }
});

startWaitingForGame();

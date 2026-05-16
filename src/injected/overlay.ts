import { cssToString } from './css-to-string';
import { MSG_SOURCE } from '@/types/messages';

let g_overlay: HTMLDivElement | null = null;
let g_minimizedBtn: HTMLDivElement | null = null;
let g_minimizedDismissed = false;
let g_overlayMinimized = false;

function getGameContainer(): Element | null {
  return document.getElementById('game-stream') ?? document.body;
}

function requestPointerLock(): void {
  const c = getGameContainer();
  if (c) {
    void (c as HTMLElement).requestPointerLock();
    const stream = document.getElementById('game-stream');
    if (stream) {
      stream.focus();
    }
  }
}

export function removeOverlay(): void {
  if (g_overlay) {
    g_overlay.remove();
    g_overlay = null;
  }
}

export function removeMinimized(): void {
  if (g_minimizedBtn) {
    g_minimizedBtn.remove();
    g_minimizedBtn = null;
  }
}

export function isOverlayMinimized(): boolean {
  return g_overlayMinimized;
}

export function setOverlayMinimized(val: boolean): void {
  g_overlayMinimized = val;
}

export function setMinimizedDismissed(val: boolean): void {
  g_minimizedDismissed = val;
}

export function restoreIfDismissed(): boolean {
  if (!g_minimizedDismissed || g_overlay || g_minimizedBtn) {
    return false;
  }
  g_minimizedDismissed = false;
  g_overlayMinimized = true;
  showMinimizedBtn(getGameContainer() ?? document.body);
  return true;
}

function showMinimizedBtn(_container: Element): void {
  if (g_minimizedBtn || g_minimizedDismissed) {
    return;
  }
  g_minimizedBtn = document.createElement('div');
  g_minimizedBtn.id = 'xvg-pointer-minimized';
  g_minimizedBtn.style.cssText = cssToString({
    position: 'fixed',
    top: '8px',
    right: '8px',
    display: 'flex',
    'align-items': 'center',
    background: 'rgba(0,0,0,0.7)',
    color: '#fff',
    'font-size': '12px',
    'font-weight': '500',
    'border-radius': '8px',
    cursor: 'pointer',
    'user-select': 'none',
    'z-index': '2147483646',
  });

  const label = document.createElement('span');
  label.textContent = 'Enable Mouse';
  label.title = 'Click to enable mouse control';
  label.style.cssText = cssToString({
    cursor: 'pointer',
    padding: '8px 2px 8px 8px',
  });
  label.addEventListener('click', () => {
    removeMinimized();
    requestPointerLock();
  });
  g_minimizedBtn.appendChild(label);

  const closeBtn = document.createElement('span');
  closeBtn.textContent = '✕';
  closeBtn.style.cssText = cssToString({
    cursor: 'pointer',
    padding: '8px 8px 8px 8px',
  });
  closeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    g_minimizedDismissed = true;
    removeMinimized();
  });
  g_minimizedBtn.appendChild(closeBtn);

  document.body.appendChild(g_minimizedBtn);
}

function minimizeOverlay(container: Element): void {
  g_overlayMinimized = true;
  window.postMessage(
    { source: MSG_SOURCE, type: 'SET_OVERLAY_MINIMIZED', minimized: true },
    '*'
  );
  removeOverlay();
  showMinimizedBtn(container);
}

export function showOverlay(container: Element): void {
  if (g_overlay) {
    return;
  }
  if (g_minimizedDismissed) {
    return;
  }
  if (g_overlayMinimized) {
    showMinimizedBtn(container);
    return;
  }

  g_overlay = document.createElement('div');
  g_overlay.id = 'xvg-pointer-overlay';
  g_overlay.style.cssText = cssToString({
    position: 'fixed',
    top: '0',
    left: '0',
    right: '0',
    bottom: '0',
    display: 'flex',
    'align-items': 'center',
    'justify-content': 'center',
    background: 'rgba(0,0,0,0.5)',
    color: '#fff',
    'font-size': '18px',
    cursor: 'pointer',
    'z-index': '2147483646',
  });

  const text = document.createElement('span');
  text.textContent = 'Click to enable mouse control';
  g_overlay.appendChild(text);

  const minimizeBtn = document.createElement('span');
  minimizeBtn.textContent = '—';
  minimizeBtn.style.cssText = cssToString({
    position: 'absolute',
    top: '8px',
    right: '8px',
    width: '24px',
    height: '24px',
    display: 'flex',
    'align-items': 'center',
    'justify-content': 'center',
    background: 'rgba(255,255,255,0.2)',
    'border-radius': '4px',
    'font-size': '14px',
    cursor: 'pointer',
  });
  minimizeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    minimizeOverlay(container);
  });
  g_overlay.appendChild(minimizeBtn);

  g_overlay.addEventListener('click', () => {
    requestPointerLock();
  });
  document.body.appendChild(g_overlay);
}

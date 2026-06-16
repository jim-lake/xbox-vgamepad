import type { KeyboardRebind } from '@/types/gamepad';

const rebindMap = new Map<string, string[]>();
const heldKeys = new Set<string>();
let dispatching = false;

function codeToKey(code: string): string {
  if (code.startsWith('Key')) {
    return code.slice(3).toLowerCase();
  }
  if (code.startsWith('Digit')) {
    return code.slice(5);
  }
  switch (code) {
    case 'Space':
      return ' ';
    case 'Enter':
      return 'Enter';
    case 'Tab':
      return 'Tab';
    case 'Escape':
      return 'Escape';
    case 'Backspace':
      return 'Backspace';
    default:
      return code;
  }
}

function onKeyDown(e: KeyboardEvent): void {
  if (dispatching) {
    return;
  }
  const toCodes = rebindMap.get(e.code);
  if (toCodes === undefined) {
    return;
  }
  e.stopImmediatePropagation();
  e.preventDefault();
  heldKeys.add(e.code);
  const target = e.target ?? document;
  dispatching = true;
  for (const toCode of toCodes) {
    target.dispatchEvent(
      new KeyboardEvent('keydown', {
        code: toCode,
        key: codeToKey(toCode),
        bubbles: true,
        cancelable: true,
        composed: true,
        ctrlKey: e.ctrlKey,
        shiftKey: e.shiftKey,
        altKey: e.altKey,
        metaKey: e.metaKey,
        repeat: e.repeat,
      })
    );
  }
  dispatching = false;
}

function onKeyUp(e: KeyboardEvent): void {
  if (dispatching) {
    return;
  }
  if (!heldKeys.has(e.code)) {
    return;
  }
  const toCodes = rebindMap.get(e.code);
  if (toCodes === undefined) {
    heldKeys.delete(e.code);
    return;
  }
  e.stopImmediatePropagation();
  e.preventDefault();
  heldKeys.delete(e.code);
  const target = e.target ?? document;
  dispatching = true;
  for (const toCode of toCodes) {
    target.dispatchEvent(
      new KeyboardEvent('keyup', {
        code: toCode,
        key: codeToKey(toCode),
        bubbles: true,
        cancelable: true,
        composed: true,
        ctrlKey: e.ctrlKey,
        shiftKey: e.shiftKey,
        altKey: e.altKey,
        metaKey: e.metaKey,
        repeat: false,
      })
    );
  }
  dispatching = false;
}

let installed = false;

export function installRebinds(rebinds: KeyboardRebind[]): void {
  rebindMap.clear();
  heldKeys.clear();
  for (const { from, to } of rebinds) {
    if (from !== '' && to.length > 0) {
      rebindMap.set(from, to);
    }
  }
  if (!installed) {
    window.addEventListener('keydown', onKeyDown, true);
    window.addEventListener('keyup', onKeyUp, true);
    installed = true;
  }
}

export function removeRebinds(): void {
  if (installed) {
    window.removeEventListener('keydown', onKeyDown, true);
    window.removeEventListener('keyup', onKeyUp, true);
    installed = false;
  }
  rebindMap.clear();
  heldKeys.clear();
}

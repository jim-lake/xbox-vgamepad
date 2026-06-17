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
    case 'Backspace':
      return 'Backspace';
    default:
      return code;
  }
}

export function dispatchKeyDown(code: string): void {
  dispatching = true;
  document.dispatchEvent(
    new KeyboardEvent('keydown', {
      code,
      key: codeToKey(code),
      bubbles: true,
      cancelable: true,
      composed: true,
      repeat: false,
    })
  );
  dispatching = false;
}

export function dispatchKeyUp(code: string): void {
  dispatching = true;
  document.dispatchEvent(
    new KeyboardEvent('keyup', {
      code,
      key: codeToKey(code),
      bubbles: true,
      cancelable: true,
      composed: true,
      repeat: false,
    })
  );
  dispatching = false;
}

export function isScriptDispatching(): boolean {
  return dispatching;
}

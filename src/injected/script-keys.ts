let dispatching = false;
const heldMouseButtons = new Map<number, number>();

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

function codeToMouseButton(code: string): number | null {
  if (code === 'Click') {
    return 0;
  }
  if (code === 'RightClick') {
    return 2;
  }
  return null;
}

function getTarget(): Element {
  return document.getElementById('game-stream') ?? document.body;
}

function getMouseInit(button: number): MouseEventInit {
  const target = getTarget();
  const rect = target.getBoundingClientRect();
  const clientX = rect.left + rect.width / 2;
  const clientY = rect.top + rect.height / 2;
  // buttons bitmask: left=1, right=2
  const buttons = button === 0 ? 1 : button === 2 ? 2 : 1 << button;
  return {
    button,
    buttons,
    clientX,
    clientY,
    screenX: clientX,
    screenY: clientY,
    movementX: 0,
    movementY: 0,
    bubbles: true,
    cancelable: true,
    composed: true,
    view: window,
    detail: 1,
  };
}

function getPointerInit(button: number): PointerEventInit {
  return {
    ...getMouseInit(button),
    pointerId: 1,
    pointerType: 'mouse',
    width: 1,
    height: 1,
    pressure: 0.5,
    isPrimary: true,
  };
}

export function dispatchKeyDown(code: string): void {
  dispatching = true;
  const btn = codeToMouseButton(code);
  if (btn !== null) {
    heldMouseButtons.set(btn, (heldMouseButtons.get(btn) ?? 0) + 1);
    const target = getTarget();
    target.dispatchEvent(new PointerEvent('pointerdown', getPointerInit(btn)));
    target.dispatchEvent(new MouseEvent('mousedown', getMouseInit(btn)));
  } else {
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
  }
  dispatching = false;
}

export function dispatchKeyUp(code: string): void {
  dispatching = true;
  const btn = codeToMouseButton(code);
  if (btn !== null) {
    const count = (heldMouseButtons.get(btn) ?? 1) - 1;
    if (count <= 0) {
      heldMouseButtons.delete(btn);
    } else {
      heldMouseButtons.set(btn, count);
    }
    const target = getTarget();
    const upInit = { ...getPointerInit(btn), buttons: 0, pressure: 0 };
    const mouseUpInit = { ...getMouseInit(btn), buttons: 0 };
    target.dispatchEvent(new PointerEvent('pointerup', upInit));
    target.dispatchEvent(new MouseEvent('mouseup', mouseUpInit));
    target.dispatchEvent(new MouseEvent('click', mouseUpInit));
  } else {
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
  }
  dispatching = false;
}

export function isScriptDispatching(): boolean {
  return dispatching;
}

export function isScriptHoldingButton(button: number): boolean {
  return (heldMouseButtons.get(button) ?? 0) > 0;
}

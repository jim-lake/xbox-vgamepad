import React from 'react';
import { StyleSheet, Text, View } from '@/components/base_components';
import IconButton from '@/components/buttons/icon_button';
import type {
  GamepadKeyboardConfig,
  GamepadActionName,
  ActionMap,
} from '@/types/gamepad';

import closeIcon from '@/assets/img/close.svg';
import plusIcon from '@/assets/img/plus.svg';

const ACTION_LABELS: { action: GamepadActionName; label: string }[] = [
  { action: 'a', label: 'A' },
  { action: 'b', label: 'B' },
  { action: 'x', label: 'X' },
  { action: 'y', label: 'Y' },
  { action: 'leftShoulder', label: 'LB' },
  { action: 'rightShoulder', label: 'RB' },
  { action: 'leftTrigger', label: 'LT' },
  { action: 'rightTrigger', label: 'RT' },
  { action: 'select', label: 'Select' },
  { action: 'start', label: 'Start' },
  { action: 'dpadUp', label: 'D-Up' },
  { action: 'dpadDown', label: 'D-Down' },
  { action: 'dpadLeft', label: 'D-Left' },
  { action: 'dpadRight', label: 'D-Right' },
  { action: 'leftStickPressed', label: 'LS Press' },
  { action: 'rightStickPressed', label: 'RS Press' },
  { action: 'leftStickUp', label: 'LS Up' },
  { action: 'leftStickDown', label: 'LS Down' },
  { action: 'leftStickLeft', label: 'LS Left' },
  { action: 'leftStickRight', label: 'LS Right' },
  { action: 'rightStickUp', label: 'RS Up' },
  { action: 'rightStickDown', label: 'RS Down' },
  { action: 'rightStickLeft', label: 'RS Left' },
  { action: 'rightStickRight', label: 'RS Right' },
  { action: 'home', label: 'Home' },
  { action: 'toggleGamepad', label: 'Toggle Gamepad' },
];

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: '0.5rem',
    paddingBottom: '0.5rem',
    borderBottomWidth: 1,
    borderBottomColor: 'var(--row-border)',
  },
  label: { width: '10rem', color: 'var(--text-muted)', fontSize: '1.4rem' },
  bindings: {
    flex: 1,
    flexDirection: 'row',
    gap: '0.4rem',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  badge: {
    backgroundColor: 'var(--chip-bg)',
    paddingLeft: '1rem',
    paddingRight: '1rem',
    paddingTop: '0.2rem',
    paddingBottom: '0.2rem',
    borderRadius: '1rem',
    flexDirection: 'row',
    alignItems: 'center',
  },
  badgeText: { color: 'var(--text-primary)', fontSize: '1.3rem' },
  deleteBtn: { marginLeft: '0.9rem' },
  addBtn: { marginLeft: '0.4rem' },
  modal: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'var(--modal-overlay)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: 'var(--app-bg)',
    padding: '2rem',
    borderRadius: '1rem',
    alignItems: 'center',
  },
  modalText: {
    color: 'var(--text-primary)',
    fontSize: '1.4rem',
    marginBottom: '1rem',
  },
  modalSub: { color: 'var(--text-muted)', fontSize: '1.3rem' },
});

/** Returns all key codes currently bound to the given action. */
function getCodesForAction(
  keyboardConfig: GamepadKeyboardConfig,
  action: GamepadActionName
): string[] {
  const codes: string[] = [];
  for (const [code, value] of Object.entries(keyboardConfig)) {
    const names = Array.isArray(value) ? value : [value];
    if (names.includes(action)) {
      codes.push(code);
    }
  }
  return codes;
}

const isMac = navigator.userAgent.includes('Mac');

function formatCode(code: string): string {
  if (code.startsWith('Key')) {
    return code.slice(3);
  }
  if (code.startsWith('Digit')) {
    return code.slice(5);
  }
  switch (code) {
    case 'RightClick':
      return 'Right Click';
    case 'ControlLeft':
      return 'Left Control';
    case 'ControlRight':
      return 'Right Control';
    case 'ShiftLeft':
      return 'Left Shift';
    case 'ShiftRight':
      return 'Right Shift';
    case 'AltLeft':
      return isMac ? 'Left Option' : 'Left Alt';
    case 'AltRight':
      return isMac ? 'Right Option' : 'Right Alt';
    case 'MetaLeft':
      return isMac ? 'Left Command' : 'Left Win';
    case 'MetaRight':
      return isMac ? 'Right Command' : 'Right Win';
    case 'ArrowUp':
      return '↑';
    case 'ArrowDown':
      return '↓';
    case 'ArrowLeft':
      return '←';
    case 'ArrowRight':
      return '→';
    case 'CapsLock':
      return 'Caps Lock';
    case 'PageUp':
      return 'Page Up';
    case 'PageDown':
      return 'Page Down';
    case 'NumLock':
      return 'Num Lock';
    case 'ScrollLock':
      return 'Scroll Lock';
    case 'PrintScreen':
      return 'Print Screen';
    case 'NumpadEnter':
      return 'Numpad Enter';
    case 'NumpadAdd':
      return 'Numpad +';
    case 'NumpadSubtract':
      return 'Numpad -';
    case 'NumpadMultiply':
      return 'Numpad *';
    case 'NumpadDivide':
      return 'Numpad /';
    case 'NumpadDecimal':
      return 'Numpad .';
    case 'Numpad0':
      return 'Numpad 0';
    case 'Numpad1':
      return 'Numpad 1';
    case 'Numpad2':
      return 'Numpad 2';
    case 'Numpad3':
      return 'Numpad 3';
    case 'Numpad4':
      return 'Numpad 4';
    case 'Numpad5':
      return 'Numpad 5';
    case 'Numpad6':
      return 'Numpad 6';
    case 'Numpad7':
      return 'Numpad 7';
    case 'Numpad8':
      return 'Numpad 8';
    case 'Numpad9':
      return 'Numpad 9';
    case 'BracketLeft':
      return '[';
    case 'BracketRight':
      return ']';
    case 'Backslash':
      return '\\';
    case 'Semicolon':
      return ';';
    case 'Quote':
      return "'";
    case 'Comma':
      return ',';
    case 'Period':
      return '.';
    case 'Slash':
      return '/';
    case 'Backquote':
      return '`';
    case 'Minus':
      return '-';
    case 'Equal':
      return '=';
    default:
      return code;
  }
}

/**
 * Add `action` to the entry for `code` in keyboardConfig.
 * Returns the updated value for that code (or undefined if it should be removed).
 */
function addActionToCode(
  keyboardConfig: GamepadKeyboardConfig,
  code: string,
  action: GamepadActionName
): ActionMap {
  const existing = keyboardConfig[code];
  if (existing === undefined) {
    return action;
  }
  const names = Array.isArray(existing) ? existing : [existing];
  if (names.includes(action)) {
    return existing;
  }
  return [...names, action];
}

/**
 * Remove `action` from the entry for `code`.
 * Returns undefined if the code should be deleted entirely.
 */
function removeActionFromCode(
  existing: ActionMap,
  action: GamepadActionName
): ActionMap | undefined {
  const names = Array.isArray(existing) ? existing : [existing];
  const next = names.filter((n) => n !== action);
  if (next.length === 0) {
    return undefined;
  }
  if (next.length === 1) {
    return next[0];
  }
  return next;
}

interface Props {
  keyboardConfig: GamepadKeyboardConfig;
  onChange: (code: string, value: ActionMap | undefined) => void;
}

export default function KeyBindingEditor({ keyboardConfig, onChange }: Props) {
  const [listening, setListening] = React.useState<GamepadActionName | null>(
    null
  );

  React.useEffect(() => {
    if (listening === null) {
      return;
    }

    function addBinding(code: string) {
      if (listening === null) {
        return;
      }
      const newValue = addActionToCode(keyboardConfig, code, listening);
      onChange(code, newValue);
      setListening(null);
    }

    function handleKeyDown(e: KeyboardEvent) {
      e.preventDefault();
      e.stopPropagation();
      if (e.code === 'Escape') {
        setListening(null);
        return;
      }
      addBinding(e.code);
    }

    function handleMouseDown(e: MouseEvent) {
      e.preventDefault();
      e.stopPropagation();
      if (e.button === 0) {
        addBinding('Click');
      } else if (e.button === 2) {
        addBinding('RightClick');
      }
    }

    function handleWheel(e: WheelEvent) {
      e.preventDefault();
      e.stopPropagation();
      addBinding('Scroll');
    }

    function handleContextMenu(e: Event) {
      e.preventDefault();
    }

    document.addEventListener('keydown', handleKeyDown, true);
    document.addEventListener('mousedown', handleMouseDown, true);
    document.addEventListener('wheel', handleWheel, true);
    document.addEventListener('contextmenu', handleContextMenu, true);

    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
      document.removeEventListener('mousedown', handleMouseDown, true);
      document.removeEventListener('wheel', handleWheel, true);
      document.removeEventListener('contextmenu', handleContextMenu, true);
    };
  }, [listening, keyboardConfig, onChange]);

  const handleRemove = React.useCallback(
    (action: GamepadActionName, code: string) => {
      const existing = keyboardConfig[code];
      if (existing === undefined) {
        return;
      }
      const next = removeActionFromCode(existing, action);
      onChange(code, next);
    },
    [keyboardConfig, onChange]
  );

  return (
    <View style={{ flexDirection: 'column' }}>
      {ACTION_LABELS.map(({ action, label }) => {
        const codes = getCodesForAction(keyboardConfig, action);
        return (
          <View key={action} style={styles.row}>
            <Text style={styles.label}>{label}</Text>
            <View style={styles.bindings}>
              {codes.map((code) => (
                <View key={code} style={styles.badge}>
                  <Text style={styles.badgeText}>{formatCode(code)}</Text>
                  <IconButton
                    style={styles.deleteBtn}
                    source={closeIcon}
                    type='danger'
                    onPress={() => {
                      handleRemove(action, code);
                    }}
                  />
                </View>
              ))}
              <IconButton
                style={styles.addBtn}
                source={plusIcon}
                type='green'
                onPress={() => {
                  setListening(action);
                }}
              />
            </View>
          </View>
        );
      })}

      {listening !== null && (
        <View style={styles.modal}>
          <View style={styles.modalContent}>
            <Text style={styles.modalText}>Press a key or mouse button</Text>
            <Text style={styles.modalSub}>Escape to cancel</Text>
          </View>
        </View>
      )}
    </View>
  );
}

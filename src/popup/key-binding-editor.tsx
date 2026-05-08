import React from 'react';
import { StyleSheet, Text, View } from '@/components/base_components';
import IconButton from '@/components/buttons/icon_button';
import type { GamepadKeyConfig, KeyMap } from '@/types/gamepad';

import closeIcon from '@/assets/img/close.svg';
import plusIcon from '@/assets/img/plus.svg';

const INPUT_LABELS: { key: keyof GamepadKeyConfig; label: string }[] = [
  { key: 'a', label: 'A' },
  { key: 'b', label: 'B' },
  { key: 'x', label: 'X' },
  { key: 'y', label: 'Y' },
  { key: 'leftShoulder', label: 'LB' },
  { key: 'rightShoulder', label: 'RB' },
  { key: 'leftTrigger', label: 'LT' },
  { key: 'rightTrigger', label: 'RT' },
  { key: 'select', label: 'Select' },
  { key: 'start', label: 'Start' },
  { key: 'leftStickPressed', label: 'L3' },
  { key: 'rightStickPressed', label: 'R3' },
  { key: 'dpadUp', label: 'D-Up' },
  { key: 'dpadDown', label: 'D-Down' },
  { key: 'dpadLeft', label: 'D-Left' },
  { key: 'dpadRight', label: 'D-Right' },
  { key: 'home', label: 'Home' },
  { key: 'leftStickUp', label: 'LS Up' },
  { key: 'leftStickDown', label: 'LS Down' },
  { key: 'leftStickLeft', label: 'LS Left' },
  { key: 'leftStickRight', label: 'LS Right' },
  { key: 'rightStickUp', label: 'RS Up' },
  { key: 'rightStickDown', label: 'RS Down' },
  { key: 'rightStickLeft', label: 'RS Left' },
  { key: 'rightStickRight', label: 'RS Right' },
  { key: 'toggleGamepad', label: 'Toggle' },
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
  label: { width: '6rem', color: 'var(--text-muted)', fontSize: '1.4rem' },
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

function getBindings(keyMap: KeyMap): string[] {
  if (keyMap === undefined) {
    return [];
  }
  if (typeof keyMap === 'string') {
    return [keyMap];
  }
  return [...keyMap];
}

function formatCode(code: string): string {
  if (code.startsWith('Key')) {
    return code.slice(3);
  }
  if (code.startsWith('Digit')) {
    return code.slice(5);
  }
  if (code === 'ControlLeft' || code === 'ControlRight') {
    return 'Ctrl';
  }
  if (code === 'ShiftLeft' || code === 'ShiftRight') {
    return 'Shift';
  }
  if (code === 'AltLeft' || code === 'AltRight') {
    return 'Alt';
  }
  return code;
}

function toKeyMap(bindings: string[]): KeyMap {
  if (bindings.length === 0) {
    return undefined;
  }
  if (bindings.length === 1) {
    return bindings[0];
  }
  return bindings;
}

interface Props {
  keyConfig: GamepadKeyConfig;
  onChange: (key: keyof GamepadKeyConfig, value: KeyMap) => void;
}

export default function KeyBindingEditor({ keyConfig, onChange }: Props) {
  const [listening, setListening] = React.useState<
    keyof GamepadKeyConfig | null
  >(null);

  React.useEffect(() => {
    if (listening === null) {
      return;
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

    function addBinding(code: string) {
      if (listening === null) {
        return;
      }
      const current = getBindings(keyConfig[listening]);
      if (current.includes(code)) {
        setListening(null);
        return;
      }
      onChange(listening, toKeyMap([...current, code]));
      setListening(null);
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
  }, [listening, keyConfig, onChange]);

  const handleRemove = React.useCallback(
    (key: keyof GamepadKeyConfig, code: string) => {
      const current = getBindings(keyConfig[key]);
      onChange(key, toKeyMap(current.filter((c) => c !== code)));
    },
    [keyConfig, onChange]
  );

  return (
    <View style={{ flexDirection: 'column' }}>
      {INPUT_LABELS.map(({ key, label }) => {
        const bindings = getBindings(keyConfig[key]);
        return (
          <View key={key} style={styles.row}>
            <Text style={styles.label}>{label}</Text>
            <View style={styles.bindings}>
              {bindings.map((code) => (
                <View key={code} style={styles.badge}>
                  <Text style={styles.badgeText}>{formatCode(code)}</Text>
                  <IconButton
                    style={styles.deleteBtn}
                    source={closeIcon}
                    type='danger'
                    onPress={() => {
                      handleRemove(key, code);
                    }}
                  />
                </View>
              ))}
              <IconButton
                style={styles.addBtn}
                source={plusIcon}
                onPress={() => {
                  setListening(key);
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

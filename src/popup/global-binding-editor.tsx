import React from 'react';
import { StyleSheet, Text, View } from '@/components/base_components';
import IconButton from '@/components/buttons/icon_button';
import type { GamepadKeyboardConfig, GamepadActionName } from '@/types/gamepad';

import closeIcon from '@/assets/img/close.svg';
import plusIcon from '@/assets/img/plus.svg';

const GLOBAL_ACTIONS: { action: GamepadActionName; label: string }[] = [
  { action: 'toggleAllGamepads', label: 'Toggle All Gamepads' },
  { action: 'toggleExtension', label: 'Toggle Extension' },
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

function getCodesForAction(
  keyboardConfig: GamepadKeyboardConfig,
  action: GamepadActionName
): string[] {
  const codes: string[] = [];
  for (const [code, entries] of Object.entries(keyboardConfig)) {
    if (entries.some((e) => e.type === 'action' && e.action === action)) {
      codes.push(code);
    }
  }
  return codes;
}

interface Props {
  keyboardConfig: GamepadKeyboardConfig;
  onChange: (
    code: string,
    action: GamepadActionName,
    op: 'add' | 'remove'
  ) => void;
}

export default function GlobalBindingEditor({
  keyboardConfig,
  onChange,
}: Props) {
  const [listening, setListening] = React.useState<GamepadActionName | null>(
    null
  );

  React.useEffect(() => {
    if (listening === null) {
      return;
    }
    const action = listening;

    function handleKeyDown(e: KeyboardEvent) {
      e.preventDefault();
      e.stopPropagation();
      if (e.code === 'Escape') {
        setListening(null);
        return;
      }
      onChange(e.code, action, 'add');
      setListening(null);
    }

    document.addEventListener('keydown', handleKeyDown, true);
    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [listening, onChange]);

  return (
    <View style={{ flexDirection: 'column' }}>
      {GLOBAL_ACTIONS.map(({ action, label }) => {
        const codes = getCodesForAction(keyboardConfig, action);
        return (
          <View key={action} style={styles.row}>
            <Text style={styles.label}>{label}</Text>
            <View style={styles.bindings}>
              {codes.map((code) => (
                <View key={code} style={styles.badge}>
                  <Text style={styles.badgeText}>{code}</Text>
                  <IconButton
                    style={styles.deleteBtn}
                    source={closeIcon}
                    type='danger'
                    onPress={() => {
                      onChange(code, action, 'remove');
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
            <Text style={styles.modalText}>Press a key</Text>
            <Text style={styles.modalSub}>Escape to cancel</Text>
          </View>
        </View>
      )}
    </View>
  );
}

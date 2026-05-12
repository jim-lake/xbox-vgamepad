import React from 'react';
import { StyleSheet, Text, View } from '@/components/base_components';
import type { GamepadKeyboardConfig, GamepadActionName } from '@/types/gamepad';
import BindingBadges from '@/components/popup/binding-badges';

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
  container: { flexDirection: 'column' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: '0.5rem',
    paddingBottom: '0.5rem',
    borderBottomWidth: 1,
    borderBottomColor: 'var(--row-border)',
  },
  label: { width: '10rem', color: 'var(--text-muted)', fontSize: '1.4rem' },
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
  for (const [code, entries] of Object.entries(keyboardConfig)) {
    if (entries.some((e) => e.type === 'action' && e.action === action)) {
      codes.push(code);
    }
  }
  return codes.sort((a, b) => a.localeCompare(b));
}

interface Props {
  keyboardConfig: GamepadKeyboardConfig;
  onChange: (
    code: string,
    action: GamepadActionName,
    op: 'add' | 'remove'
  ) => void;
}

export default function KeyBindingEditor({ keyboardConfig, onChange }: Props) {
  const visibleActions = ACTION_LABELS;
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
      onChange(code, listening, 'add');
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
  }, [listening, onChange]);

  const handleRemove = React.useCallback(
    (action: GamepadActionName, code: string) => {
      onChange(code, action, 'remove');
    },
    [onChange]
  );

  return (
    <View style={styles.container}>
      {visibleActions.map(({ action, label }) => {
        const codes = getCodesForAction(keyboardConfig, action);
        return (
          <View key={action} style={styles.row}>
            <Text style={styles.label}>{label}</Text>
            <BindingBadges
              codes={codes}
              onAdd={() => {
                setListening(action);
              }}
              onRemove={(code) => {
                handleRemove(action, code);
              }}
            />
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

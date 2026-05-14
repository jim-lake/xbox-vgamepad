import React from 'react';
import { StyleSheet, View } from '@/components/base_components';
import type { GamepadActionName } from '@/types/gamepad';
import type { SlotBindings } from '@/types/popup';
import BindingBadges from '@/components/popup/binding-badges';
import FormRow from '@/components/popup/form-row';
import KeyCaptureModal from '@/components/popup/key-capture-modal';

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

const styles = StyleSheet.create({ container: { flexDirection: 'column' } });

interface Props {
  bindings: SlotBindings;
  onChange: (
    action: GamepadActionName,
    code: string,
    op: 'add' | 'remove'
  ) => void;
}

export default function KeyBindingEditor({ bindings, onChange }: Props) {
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
      onChange(listening, code, 'add');
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

  return (
    <View style={styles.container}>
      {ACTION_LABELS.map(({ action, label }) => {
        const codes = [...bindings[action]].sort((a, b) => a.localeCompare(b));
        return (
          <FormRow key={action} label={label}>
            <BindingBadges
              codes={codes}
              onAdd={() => {
                setListening(action);
              }}
              onRemove={(code) => {
                onChange(action, code, 'remove');
              }}
            />
          </FormRow>
        );
      })}

      {listening !== null && <KeyCaptureModal />}
    </View>
  );
}

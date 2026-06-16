import React from 'react';
import { StyleSheet, View } from '@/components/base_components';
import type { GamepadActionName } from '@/types/gamepad';
import type { SlotBindings } from '@/types/popup';
import BindingBadges from '@/components/popup/binding-badges';
import FormRow from '@/components/popup/form-row';
import KeyCaptureModal from '@/components/popup/key-capture-modal';
import { ACTION_LABELS } from './action-labels';

const styles = StyleSheet.create({ container: { flexDirection: 'column' } });

interface Props {
  bindings: SlotBindings;
  codeToLabels: Record<string, string[]>;
  onChange: (
    action: GamepadActionName,
    code: string,
    op: 'add' | 'remove'
  ) => void;
}

export default function KeyBindingEditor({
  bindings,
  codeToLabels,
  onChange,
}: Props) {
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
              codeToLabels={codeToLabels}
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

      {listening !== null && (
        <KeyCaptureModal onClose={() => { setListening(null); }} />
      )}
    </View>
  );
}

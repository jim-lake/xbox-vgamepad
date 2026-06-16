import React from 'react';
import { StyleSheet, View } from '@/components/base_components';
import type { GamepadActionName } from '@/types/gamepad';
import type { GlobalBindings } from '@/types/popup';
import BindingBadges from '@/components/popup/binding-badges';
import FormRow from '@/components/popup/form-row';
import KeyCaptureModal from '@/components/popup/key-capture-modal';

const GLOBAL_ACTIONS: { action: GamepadActionName; label: string }[] = [
  { action: 'toggleAllGamepads', label: 'Toggle All Gamepads' },
  { action: 'toggleExtension', label: 'Toggle Extension' },
];

const styles = StyleSheet.create({ container: { flexDirection: 'column' } });

interface Props {
  globalBindings: GlobalBindings;
  onChange: (
    action: GamepadActionName,
    code: string,
    op: 'add' | 'remove'
  ) => void;
}

export default function GlobalBindingEditor({
  globalBindings,
  onChange,
}: Props) {
  const [listening, setListening] = React.useState<GamepadActionName | null>(
    null
  );

  const codeToLabels = React.useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const { action, label } of GLOBAL_ACTIONS) {
      for (const code of globalBindings[action]) {
        (map[code] ??= []).push(label);
      }
    }
    return map;
  }, [globalBindings]);

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
      onChange(action, e.code, 'add');
      setListening(null);
    }

    document.addEventListener('keydown', handleKeyDown, true);
    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [listening, onChange]);

  return (
    <View style={styles.container}>
      {GLOBAL_ACTIONS.map(({ action, label }) => {
        const codes = globalBindings[action];
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
        <KeyCaptureModal
          onClose={() => {
            setListening(null);
          }}
        />
      )}
    </View>
  );
}

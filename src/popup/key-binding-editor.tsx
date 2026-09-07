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

  const handleCapture = React.useCallback(
    (code: string) => {
      if (listening === null) {
        return;
      }
      onChange(listening, code, 'add');
      setListening(null);
    },
    [listening, onChange]
  );

  return (
    <View style={styles.container}>
      {ACTION_LABELS.map(({ action, label }) => {
        const codes = [...(bindings.get(action) ?? [])].sort((a, b) =>
          a.localeCompare(b)
        );
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
          captureScroll
          onCapture={handleCapture}
          onClose={() => {
            setListening(null);
          }}
        />
      )}
    </View>
  );
}

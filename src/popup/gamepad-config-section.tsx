import React from 'react';
import { StyleSheet, Text, View } from '@/components/base_components';
import Select from '@/components/select';
import MouseSettings from './mouse-settings';
import KeyBindingEditor from './key-binding-editor';
import type { GamepadConfig, ActionMap } from '@/types/gamepad';

const styles = StyleSheet.create({
  section: { padding: '0.8rem', flexDirection: 'column' },
  sectionTitle: {
    color: 'var(--text-muted)',
    fontSize: '1.4rem',
    fontWeight: '600',
    marginBottom: '0.4rem',
    textTransform: 'uppercase',
  },
  row: {
    paddingTop: '0.5rem',
    paddingBottom: '0.5rem',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'var(--row-border)',
  },
  label: { color: 'var(--text-muted)', fontSize: '1.3rem' },
  select: {
    padding: '2px 4px 2px 6px',
    width: '6rem',
    color: 'var(--text-muted)',
    fontSize: '1.4rem',
    appearance: 'auto',
    borderWidth: 1,
    borderRadius: 6,
    backgroundColor: '#fefefe',
  },
});

interface Props {
  config: GamepadConfig;
  gamepadIndex: 0 | 1 | 2 | 3;
  usedIndices: (0 | 1 | 2 | 3)[];
  onChangeIndex: (next: 0 | 1 | 2 | 3) => void;
  onChangeKeyboard: (code: string, value: ActionMap | undefined) => void;
  onChangeMouseStick: (val: 'left' | 'right' | undefined) => void;
  onChangeMouseSensitivity: (val: number) => void;
}

const GAMEPAD_OPTIONS = [
  { value: '0', text: '1' },
  { value: '1', text: '2' },
  { value: '2', text: '3' },
  { value: '3', text: '4' },
] as const;

export default function GamepadConfigSection({
  config,
  gamepadIndex,
  usedIndices,
  onChangeIndex,
  onChangeKeyboard,
  onChangeMouseStick,
  onChangeMouseSensitivity,
}: Props) {
  // Filter mouseControls to just this slot's entry
  const mouseControls = config.mouseConfig.mouseControls.filter(
    (m) => m.gamepadIndex === gamepadIndex
  );

  // Filter keyboardConfig to only entries that have at least one action for this index
  const slotKeyboardConfig = React.useMemo(() => {
    const result: GamepadConfig['keyboardConfig'] = {};
    for (const [code, entries] of Object.entries(config.keyboardConfig)) {
      const filtered = entries.filter(
        (e) => e.type !== 'action' || e.gamepadIndex === gamepadIndex
      );
      if (filtered.length > 0) {
        result[code] = filtered;
      }
    }
    return result;
  }, [config.keyboardConfig, gamepadIndex]);

  return (
    <>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Gamepad</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Gamepad Number</Text>
          <Select
            style={styles.select}
            value={String(gamepadIndex)}
            options={GAMEPAD_OPTIONS.map((opt) => ({
              ...opt,
              disabled:
                opt.value !== String(gamepadIndex) &&
                usedIndices.includes(Number(opt.value) as 0 | 1 | 2 | 3),
            }))}
            onChange={(val) => {
              onChangeIndex(Number(val) as 0 | 1 | 2 | 3);
            }}
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Mouse</Text>
        <MouseSettings
          mouseControls={mouseControls}
          onChangeStick={onChangeMouseStick}
          onChangeSensitivity={onChangeMouseSensitivity}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Key Bindings</Text>
        <KeyBindingEditor
          keyboardConfig={slotKeyboardConfig}
          onChange={onChangeKeyboard}
        />
      </View>
    </>
  );
}

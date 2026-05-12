import React from 'react';
import { StyleSheet, Text, View } from '@/components/base_components';
import Select from '@/components/select';
import TextButton from '@/components/buttons/text_button';
import MouseSettings from '@/components/popup/mouse-settings';
import KeyBindingEditor from './key-binding-editor';
import ScriptEditor from './script-editor';
import type { ScriptEntry } from './script-helpers';
import type {
  GamepadConfig,
  GamepadActionName,
  GamepadKeyboardConfig,
} from '@/types/gamepad';

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
  },
  label: { color: 'var(--text-muted)', fontSize: '1.3rem' },
  rowEnd: {
    paddingTop: '0.5rem',
    paddingBottom: '0.5rem',
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'var(--row-border)',
  },
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
  gamepadCount: number;
  editingScriptKey: string | null;
  listeningScriptEntry: ScriptEntry | null;
  onEditingScriptKeyChange: (key: string | null) => void;
  onListeningScriptEntryChange: (entry: ScriptEntry | null) => void;
  onChangeIndex: (next: 0 | 1 | 2 | 3) => void;
  onChangeKeyboard: (
    code: string,
    action: GamepadActionName,
    op: 'add' | 'remove'
  ) => void;
  onChangeScripts: (keyboardConfig: GamepadKeyboardConfig) => void;
  onChangeMouseStick: (val: 'left' | 'right' | undefined) => void;
  onChangeMouseSensitivity: (val: number) => void;
  onRemove: () => void;
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
  gamepadCount,
  editingScriptKey,
  listeningScriptEntry,
  onEditingScriptKeyChange,
  onListeningScriptEntryChange,
  onChangeIndex,
  onChangeKeyboard,
  onChangeScripts,
  onChangeMouseStick,
  onChangeMouseSensitivity,
  onRemove,
}: Props) {
  const mouseControls = config.mouseConfig.mouseControls.filter(
    (m) => m.gamepadIndex === gamepadIndex
  );

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
        <Text style={styles.sectionTitle}>Config</Text>
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
        {gamepadCount > 1 && (
          <View style={styles.rowEnd}>
            <TextButton
              text='Remove Gamepad'
              type='danger'
              onPress={() => {
                if (window.confirm('Remove this gamepad?')) {
                  onRemove();
                }
              }}
            />
          </View>
        )}
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

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Scripts</Text>
        <ScriptEditor
          keyboardConfig={config.keyboardConfig}
          gamepadIndex={gamepadIndex}
          editingKeyCode={editingScriptKey}
          listeningEntry={listeningScriptEntry}
          onEditingKeyCodeChange={onEditingScriptKeyChange}
          onListeningEntryChange={onListeningScriptEntryChange}
          onChange={onChangeScripts}
        />
      </View>
    </>
  );
}

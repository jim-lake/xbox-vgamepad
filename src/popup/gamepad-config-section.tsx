import React from 'react';
import { StyleSheet, Text, View } from '@/components/base_components';
import Select from '@/components/select';
import Switch from '@/components/switch';
import TextButton from '@/components/buttons/text_button';
import MouseSettings from '@/components/popup/mouse-settings';
import SectionHeader from '@/components/popup/section-header';
import KeyBindingEditor from './key-binding-editor';
import ScriptEditor from './script-editor';
import type { ScriptEntry } from './script-helpers';
import { isSentinelKey } from './script-helpers';
import { ACTION_LABELS } from './action-labels';
import type { GamepadActionName } from '@/types/gamepad';
import type {
  PopupGameScript,
  PopupSlot,
  PopupScript,
  ScriptBinding,
} from '@/types/popup';

const styles = StyleSheet.create({
  section: { padding: '0.8rem', flexDirection: 'column' },
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
  select: { width: '6rem' },
});

interface Props {
  slot: PopupSlot;
  scripts: PopupScript[];
  usedIndices: (0 | 1 | 2 | 3)[];
  gamepadCount: number;
  isConnected: boolean;
  editingScriptId: string | null;
  listeningScriptEntry: ScriptEntry | null;
  onEditingScriptIdChange: (id: string | null) => void;
  onListeningScriptEntryChange: (entry: ScriptEntry | null) => void;
  onToggleConnected: () => void;
  onChangeIndex: (next: 0 | 1 | 2 | 3) => void;
  onChangeBinding: (
    action: GamepadActionName,
    code: string,
    op: 'add' | 'remove'
  ) => void;
  onChangeScripts: (
    scriptBindings: ScriptBinding[],
    scripts: PopupScript[]
  ) => void;
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
  slot,
  scripts,
  usedIndices,
  gamepadCount,
  isConnected,
  editingScriptId,
  listeningScriptEntry,
  onEditingScriptIdChange,
  onListeningScriptEntryChange,
  onToggleConnected,
  onChangeIndex,
  onChangeBinding,
  onChangeScripts,
  onChangeMouseStick,
  onChangeMouseSensitivity,
  onRemove,
}: Props) {
  const codeToLabels = React.useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const { action, label } of ACTION_LABELS) {
      for (const code of slot.bindings.get(action) ?? []) {
        (map[code] ??= []).push(label);
      }
    }
    for (const binding of slot.scriptBindings) {
      const ps = scripts.find((s) => s.scriptId === binding.scriptId);
      if (!ps) {
        continue;
      }
      const name = ps.script.name || '(unnamed)';
      for (const code of binding.keyCodes) {
        if (!isSentinelKey(code)) {
          (map[code] ??= []).push(name);
        }
      }
    }
    return map;
  }, [slot.bindings, slot.scriptBindings, scripts]);

  function handleAddScript() {
    const script: PopupGameScript = {
      type: 'script',
      name: 'New Script',
      activationType: 'on_down',
      actions: [],
    };
    const scriptId = `script_${String(Date.now())}`;
    onChangeScripts(
      [...slot.scriptBindings, { scriptId, keyCodes: [] }],
      [...scripts, { scriptId, script }]
    );
    onEditingScriptIdChange(scriptId);
  }

  return (
    <>
      <View style={styles.section}>
        <SectionHeader title='Config' />
        <View style={styles.row}>
          <Text style={styles.label}>Connected</Text>
          <Switch value={isConnected} onValueChange={onToggleConnected} />
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Gamepad Number</Text>
          <Select
            style={styles.select}
            value={String(slot.gamepadIndex)}
            options={GAMEPAD_OPTIONS.map((opt) => ({
              ...opt,
              disabled:
                opt.value !== String(slot.gamepadIndex) &&
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
        <SectionHeader title='Mouse' />
        <MouseSettings
          mouse={slot.mouse}
          onChangeStick={onChangeMouseStick}
          onChangeSensitivity={onChangeMouseSensitivity}
        />
      </View>

      <View style={styles.section}>
        <SectionHeader title='Key Bindings' />
        <KeyBindingEditor
          bindings={slot.bindings}
          codeToLabels={codeToLabels}
          onChange={onChangeBinding}
        />
      </View>

      <View style={styles.section}>
        <SectionHeader
          title='Scripts'
          buttonText='Add Script'
          buttonType='green'
          onPress={handleAddScript}
        />
        <ScriptEditor
          scriptBindings={slot.scriptBindings}
          scripts={scripts}
          gamepadIndex={slot.gamepadIndex}
          codeToLabels={codeToLabels}
          editingScriptId={editingScriptId}
          listeningEntry={listeningScriptEntry}
          onEditingScriptIdChange={onEditingScriptIdChange}
          onListeningEntryChange={onListeningScriptEntryChange}
          onChangeBindings={onChangeScripts}
        />
      </View>
    </>
  );
}

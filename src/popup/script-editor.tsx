import React from 'react';
import { View, StyleSheet } from '@/components/base_components';
import TextButton from '@/components/buttons/text_button';
import type { GamepadKeyboardConfig, GameScript } from '@/types/gamepad';
import {
  extractScripts,
  replaceScript,
  removeScript,
  addScript,
  freeSentinel,
  copyScriptForSlot,
  isSentinelKey,
} from './script-helpers';
import ScriptRow from '@/components/popup/script-row';
import ScriptEditBox from '@/components/popup/script-edit-box';
import KeyCaptureModal from '@/components/popup/key-capture-modal';
import type { ScriptEntry } from './script-helpers';

const styles = StyleSheet.create({
  container: { flexDirection: 'column' },
  addRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingTop: '0.5rem',
  },
});

interface Props {
  keyboardConfig: GamepadKeyboardConfig;
  gamepadIndex: 0 | 1 | 2 | 3;
  editingKeyCode: string | null;
  listeningEntry: ScriptEntry | null;
  onEditingKeyCodeChange: (keyCode: string | null) => void;
  onListeningEntryChange: (entry: ScriptEntry | null) => void;
  onChange: (keyboardConfig: GamepadKeyboardConfig) => void;
}

export default function ScriptEditor({
  keyboardConfig,
  gamepadIndex,
  editingKeyCode,
  listeningEntry,
  onEditingKeyCodeChange,
  onListeningEntryChange,
  onChange,
}: Props) {
  const [prevConfig, setPrevConfig] =
    React.useState<GamepadKeyboardConfig>(keyboardConfig);
  const [entries, setEntries] = React.useState<
    ReturnType<typeof extractScripts>
  >(() => extractScripts(keyboardConfig));
  if (keyboardConfig !== prevConfig) {
    setPrevConfig(keyboardConfig);
    const extracted = extractScripts(keyboardConfig);
    if (editingKeyCode !== null) {
      const orderMap = new Map(entries.map((e, i) => [e.script, i]));
      extracted.sort(
        (a, b) => (orderMap.get(a.script) ?? 0) - (orderMap.get(b.script) ?? 0)
      );
    }
    setEntries(extracted);
  }

  React.useEffect(() => {
    if (listeningEntry === null) {
      return;
    }
    const entry = listeningEntry;

    function handleKeyDown(e: KeyboardEvent) {
      e.preventDefault();
      e.stopPropagation();
      if (e.code === 'Escape') {
        onListeningEntryChange(null);
        return;
      }
      const newKeyCodes = [
        ...entry.keyCodes.filter((c) => !isSentinelKey(c)),
        e.code,
      ];
      onChange(
        replaceScript(
          keyboardConfig,
          entry,
          newKeyCodes,
          copyScriptForSlot(entry.script, gamepadIndex)
        )
      );
      onListeningEntryChange(null);
    }

    function handleMouseDown(e: MouseEvent) {
      e.preventDefault();
      e.stopPropagation();
      const code = e.button === 2 ? 'RightClick' : 'Click';
      const newKeyCodes = [
        ...entry.keyCodes.filter((c) => !isSentinelKey(c)),
        code,
      ];
      onChange(
        replaceScript(
          keyboardConfig,
          entry,
          newKeyCodes,
          copyScriptForSlot(entry.script, gamepadIndex)
        )
      );
      onListeningEntryChange(null);
    }

    function handleContextMenu(e: Event) {
      e.preventDefault();
    }

    document.addEventListener('keydown', handleKeyDown, true);
    document.addEventListener('mousedown', handleMouseDown, true);
    document.addEventListener('contextmenu', handleContextMenu, true);
    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
      document.removeEventListener('mousedown', handleMouseDown, true);
      document.removeEventListener('contextmenu', handleContextMenu, true);
    };
  }, [
    listeningEntry,
    keyboardConfig,
    gamepadIndex,
    onChange,
    onListeningEntryChange,
  ]);

  function handleAdd() {
    const script: GameScript = {
      type: 'script',
      name: 'New Script',
      activationType: 'on_down',
      actions: [],
    };
    const [newConfig, sentinel] = addScript(keyboardConfig, script);
    onChange(newConfig);
    onEditingKeyCodeChange(sentinel);
  }

  function handleScriptChange(entry: ScriptEntry, newScript: GameScript) {
    onChange(replaceScript(keyboardConfig, entry, entry.keyCodes, newScript));
  }

  function handleDelete(entry: ScriptEntry) {
    if (!window.confirm('Delete this script?')) {
      return;
    }
    onChange(removeScript(keyboardConfig, entry));
    onEditingKeyCodeChange(null);
  }

  function handleRemoveBinding(entry: ScriptEntry, code: string) {
    const remaining = entry.keyCodes.filter((c) => c !== code);
    if (remaining.length === 0) {
      const sentinel = freeSentinel(keyboardConfig, code);
      onChange(replaceScript(keyboardConfig, entry, [sentinel], entry.script));
    } else {
      onChange(replaceScript(keyboardConfig, entry, remaining, entry.script));
    }
  }

  return (
    <View style={styles.container}>
      {entries.map((entry) => {
        const entryKey = entry.keyCodes[0] ?? '';
        if (entryKey === editingKeyCode) {
          return (
            <ScriptEditBox
              key={entryKey}
              script={entry.script}
              gamepadIndex={gamepadIndex}
              onChange={(s) => {
                handleScriptChange(entry, s);
              }}
              onDone={() => {
                onEditingKeyCodeChange(null);
              }}
              onDelete={() => {
                handleDelete(entry);
              }}
            />
          );
        }
        return (
          <ScriptRow
            key={entryKey}
            entry={entry}
            onEdit={() => {
              onEditingKeyCodeChange(entryKey);
            }}
            onAddBinding={() => {
              onListeningEntryChange(entry);
            }}
            onRemoveBinding={(code) => {
              handleRemoveBinding(entry, code);
            }}
          />
        );
      })}

      <View style={styles.addRow}>
        <TextButton text='Add Script' type='green' onPress={handleAdd} />
      </View>

      {listeningEntry !== null && <KeyCaptureModal />}
    </View>
  );
}

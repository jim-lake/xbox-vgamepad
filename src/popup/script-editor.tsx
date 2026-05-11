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
} from './script-helpers';
import ScriptRow from './script-row';
import ScriptEditBox from './script-edit-box';
import KeyCaptureModal from './key-capture-modal';
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
  const entries = React.useMemo(
    () => extractScripts(keyboardConfig),
    [keyboardConfig]
  );

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
      onChange(
        replaceScript(
          keyboardConfig,
          entry,
          e.code,
          copyScriptForSlot(entry.script, gamepadIndex)
        )
      );
      onListeningEntryChange(null);
    }

    function handleMouseDown(e: MouseEvent) {
      e.preventDefault();
      e.stopPropagation();
      const code = e.button === 2 ? 'RightClick' : 'Click';
      onChange(
        replaceScript(
          keyboardConfig,
          entry,
          code,
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
    onChange(replaceScript(keyboardConfig, entry, entry.keyCode, newScript));
  }

  function handleDelete(entry: ScriptEntry) {
    onChange(removeScript(keyboardConfig, entry));
    onEditingKeyCodeChange(null);
  }

  function handleRemoveBinding(entry: ScriptEntry) {
    const sentinel = freeSentinel(keyboardConfig, entry.keyCode);
    onChange(replaceScript(keyboardConfig, entry, sentinel, entry.script));
  }

  return (
    <View style={styles.container}>
      {entries.map((entry) => {
        if (entry.keyCode === editingKeyCode) {
          return (
            <ScriptEditBox
              key={entry.keyCode}
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
            key={entry.keyCode}
            entry={entry}
            onEdit={() => {
              onEditingKeyCodeChange(entry.keyCode);
            }}
            onAddBinding={() => {
              onListeningEntryChange(entry);
            }}
            onRemoveBinding={() => {
              handleRemoveBinding(entry);
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

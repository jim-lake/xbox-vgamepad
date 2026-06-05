import React from 'react';
import { View, StyleSheet } from '@/components/base_components';
import TextButton from '@/components/buttons/text_button';
import type { PopupGameScript } from '@/types/popup';
import type { ScriptBinding, PopupScript } from '@/types/popup';
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
  scriptBindings: ScriptBinding[];
  scripts: PopupScript[];
  gamepadIndex: 0 | 1 | 2 | 3;
  codeToLabels: Record<string, string[]>;
  editingScriptId: string | null;
  listeningEntry: ScriptEntry | null;
  onEditingScriptIdChange: (id: string | null) => void;
  onListeningEntryChange: (entry: ScriptEntry | null) => void;
  onChangeBindings: (
    scriptBindings: ScriptBinding[],
    scripts: PopupScript[]
  ) => void;
}

export default function ScriptEditor({
  scriptBindings,
  scripts,
  gamepadIndex,
  codeToLabels,
  editingScriptId,
  listeningEntry,
  onEditingScriptIdChange,
  onListeningEntryChange,
  onChangeBindings,
}: Props) {
  React.useEffect(() => {
    if (listeningEntry === null) {
      return;
    }
    const entry = listeningEntry;
    const scriptId = scripts.find((s) => s.script === entry.script)?.scriptId;

    function handleKeyDown(e: KeyboardEvent) {
      e.preventDefault();
      e.stopPropagation();
      if (e.code === 'Escape') {
        onListeningEntryChange(null);
        return;
      }
      addKey(e.code);
    }
    function handleMouseDown(e: MouseEvent) {
      e.preventDefault();
      e.stopPropagation();
      addKey(e.button === 2 ? 'RightClick' : 'Click');
    }
    function handleContextMenu(e: Event) {
      e.preventDefault();
    }

    function addKey(code: string) {
      if (!scriptId) {
        onListeningEntryChange(null);
        return;
      }
      const binding = scriptBindings.find((b) => b.scriptId === scriptId);
      if (!binding) {
        onListeningEntryChange(null);
        return;
      }
      const keyCodes = [...binding.keyCodes.filter((c) => c !== code), code];
      onChangeBindings(
        scriptBindings.map((b) =>
          b.scriptId === scriptId ? { ...b, keyCodes } : b
        ),
        scripts
      );
      onListeningEntryChange(null);
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
    scriptBindings,
    scripts,
    onChangeBindings,
    onListeningEntryChange,
  ]);

  function handleAdd() {
    const script: PopupGameScript = {
      type: 'script',
      name: 'New Script',
      activationType: 'on_down',
      actions: [],
    };
    const scriptId = `script_${String(Date.now())}`;
    onChangeBindings(
      [...scriptBindings, { scriptId, keyCodes: [] }],
      [...scripts, { scriptId, script }]
    );
    onEditingScriptIdChange(scriptId);
  }

  function handleScriptChange(scriptId: string, newScript: PopupGameScript) {
    onChangeBindings(
      scriptBindings,
      scripts.map((s) =>
        s.scriptId === scriptId ? { ...s, script: newScript } : s
      )
    );
  }

  function handleDelete(scriptId: string) {
    if (!window.confirm('Delete this script?')) {
      return;
    }
    // Only remove from scripts — stale bindings are culled on save
    onChangeBindings(
      scriptBindings,
      scripts.filter((s) => s.scriptId !== scriptId)
    );
    onEditingScriptIdChange(null);
  }

  function handleRemoveBinding(scriptId: string, code: string) {
    onChangeBindings(
      scriptBindings.map((b) =>
        b.scriptId === scriptId
          ? { ...b, keyCodes: b.keyCodes.filter((c) => c !== code) }
          : b
      ),
      scripts
    );
  }

  return (
    <View style={styles.container}>
      {scripts.map((ps) => {
        const keyCodes =
          scriptBindings.find((b) => b.scriptId === ps.scriptId)?.keyCodes ??
          [];
        const entry: ScriptEntry = { keyCodes, script: ps.script };

        if (ps.scriptId === editingScriptId) {
          return (
            <ScriptEditBox
              key={ps.scriptId}
              script={entry.script}
              boundKeys={keyCodes}
              gamepadIndex={gamepadIndex}
              codeToLabels={codeToLabels}
              onChange={(s) => {
                handleScriptChange(ps.scriptId, s);
              }}
              onAddBinding={() => {
                onListeningEntryChange(entry);
              }}
              onRemoveBinding={(code) => {
                handleRemoveBinding(ps.scriptId, code);
              }}
              onDone={() => {
                onEditingScriptIdChange(null);
              }}
              onDelete={() => {
                handleDelete(ps.scriptId);
              }}
            />
          );
        }
        return (
          <ScriptRow
            key={ps.scriptId}
            entry={entry}
            codeToLabels={codeToLabels}
            onEdit={() => {
              onEditingScriptIdChange(ps.scriptId);
            }}
            onAddBinding={() => {
              onListeningEntryChange(entry);
            }}
            onRemoveBinding={(code) => {
              handleRemoveBinding(ps.scriptId, code);
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

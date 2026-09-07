import React from 'react';
import { View, StyleSheet } from '@/components/base_components';
import type { PopupGameScript } from '@/types/popup';
import type { ScriptBinding, PopupScript } from '@/types/popup';
import ScriptRow from '@/components/popup/script-row';
import ScriptEditBox from '@/components/popup/script-edit-box';
import KeyCaptureModal from '@/components/popup/key-capture-modal';
import type { ScriptEntry } from './script-helpers';
import { errorLog } from '@/tools/log';

const styles = StyleSheet.create({ container: { flexDirection: 'column' } });

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
  const handleCapture = React.useCallback(
    (code: string) => {
      if (listeningEntry === null) {
        return;
      }
      const entry = listeningEntry;
      const scriptId = scripts.find((s) => s.script === entry.script)?.scriptId;
      if (!scriptId) {
        errorLog(
          'handleCapture: could not resolve scriptId for listeningEntry',
          entry
        );
        onListeningEntryChange(null);
        return;
      }
      const binding = scriptBindings.find((b) => b.scriptId === scriptId);
      if (!binding) {
        errorLog('handleCapture: no binding found for scriptId', scriptId);
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
    },
    [
      listeningEntry,
      scriptBindings,
      scripts,
      onChangeBindings,
      onListeningEntryChange,
    ]
  );

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

      {listeningEntry !== null && (
        <KeyCaptureModal
          onCapture={handleCapture}
          onClose={() => {
            onListeningEntryChange(null);
          }}
        />
      )}
    </View>
  );
}

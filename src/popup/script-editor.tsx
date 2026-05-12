import React from 'react';
import { View, StyleSheet } from '@/components/base_components';
import TextButton from '@/components/buttons/text_button';
import type { GameScript } from '@/types/gamepad';
import type { ScriptBinding, PopupScript } from '@/types/popup';
import { isSentinelKey, SENTINEL_PREFIX } from './script-helpers';
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
  editingScriptId: string | null;
  listeningEntry: ScriptEntry | null;
  onEditingScriptIdChange: (id: string | null) => void;
  onListeningEntryChange: (entry: ScriptEntry | null) => void;
  onChangeBindings: (
    scriptBindings: ScriptBinding[],
    scripts: PopupScript[]
  ) => void;
}

function makeEntry(
  binding: ScriptBinding,
  scripts: PopupScript[]
): ScriptEntry | null {
  const ps = scripts.find((s) => s.scriptId === binding.scriptId);
  if (!ps) {
    return null;
  }
  return { keyCodes: binding.keyCodes, script: ps.script };
}

function nextSentinel(usedKeys: Set<string>): string {
  let sentinel = SENTINEL_PREFIX;
  let i = 0;
  while (usedKeys.has(sentinel)) {
    i++;
    sentinel = `${SENTINEL_PREFIX}${String(i)}`;
  }
  return sentinel;
}

export default function ScriptEditor({
  scriptBindings,
  scripts,
  gamepadIndex,
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
    const binding =
      scriptBindings.find(
        (b) =>
          b.keyCodes.some((c) => entry.keyCodes.includes(c)) ||
          (b.keyCodes.length === 0 && entry.keyCodes.length === 0)
      ) ??
      scriptBindings.find((b) => {
        const ps = scripts.find((s) => s.scriptId === b.scriptId);
        return ps?.script === entry.script;
      });

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
      if (!binding) {
        onListeningEntryChange(null);
        return;
      }
      const allKeys = new Set(scriptBindings.flatMap((b) => b.keyCodes));
      const newKeyCodes = [
        ...binding.keyCodes.filter((c) => !isSentinelKey(c)),
        code,
      ];
      // If was unbound (sentinel), remove sentinel from allKeys
      const updatedBindings = scriptBindings.map((b) =>
        b.scriptId === binding.scriptId ? { ...b, keyCodes: newKeyCodes } : b
      );
      // Remove any sentinel keys that are no longer needed
      void allKeys;
      onChangeBindings(updatedBindings, scripts);
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
    const script: GameScript = {
      type: 'script',
      name: 'New Script',
      activationType: 'on_down',
      actions: [],
    };
    const usedKeys = new Set(scriptBindings.flatMap((b) => b.keyCodes));
    const sentinel = nextSentinel(usedKeys);
    const scriptId = `script_${String(Date.now())}`;
    const newScripts = [...scripts, { scriptId, script }];
    const newBindings = [...scriptBindings, { scriptId, keyCodes: [sentinel] }];
    onChangeBindings(newBindings, newScripts);
    onEditingScriptIdChange(scriptId);
  }

  function handleScriptChange(scriptId: string, newScript: GameScript) {
    const newScripts = scripts.map((s) =>
      s.scriptId === scriptId ? { ...s, script: newScript } : s
    );
    onChangeBindings(scriptBindings, newScripts);
  }

  function handleDelete(scriptId: string) {
    if (!window.confirm('Delete this script?')) {
      return;
    }
    onChangeBindings(
      scriptBindings.filter((b) => b.scriptId !== scriptId),
      scripts.filter((s) => s.scriptId !== scriptId)
    );
    onEditingScriptIdChange(null);
  }

  function handleRemoveBinding(scriptId: string, code: string) {
    const binding = scriptBindings.find((b) => b.scriptId === scriptId);
    if (!binding) {
      return;
    }
    const remaining = binding.keyCodes.filter((c) => c !== code);
    if (remaining.length === 0) {
      const usedKeys = new Set(
        scriptBindings.flatMap((b) =>
          b.scriptId === scriptId ? [] : b.keyCodes
        )
      );
      const sentinel = nextSentinel(usedKeys);
      const newBindings = scriptBindings.map((b) =>
        b.scriptId === scriptId ? { ...b, keyCodes: [sentinel] } : b
      );
      onChangeBindings(newBindings, scripts);
    } else {
      const newBindings = scriptBindings.map((b) =>
        b.scriptId === scriptId ? { ...b, keyCodes: remaining } : b
      );
      onChangeBindings(newBindings, scripts);
    }
  }

  return (
    <View style={styles.container}>
      {scriptBindings.map((binding) => {
        const entry = makeEntry(binding, scripts);
        if (!entry) {
          return null;
        }
        const boundKeys = binding.keyCodes.filter((c) => !isSentinelKey(c));

        if (binding.scriptId === editingScriptId) {
          return (
            <ScriptEditBox
              key={binding.scriptId}
              script={entry.script}
              boundKeys={boundKeys}
              gamepadIndex={gamepadIndex}
              onChange={(s) => {
                handleScriptChange(binding.scriptId, s);
              }}
              onAddBinding={() => {
                onListeningEntryChange(entry);
              }}
              onRemoveBinding={(code) => {
                handleRemoveBinding(binding.scriptId, code);
              }}
              onDone={() => {
                onEditingScriptIdChange(null);
              }}
              onDelete={() => {
                handleDelete(binding.scriptId);
              }}
            />
          );
        }
        return (
          <ScriptRow
            key={binding.scriptId}
            entry={entry}
            onEdit={() => {
              onEditingScriptIdChange(binding.scriptId);
            }}
            onAddBinding={() => {
              onListeningEntryChange(entry);
            }}
            onRemoveBinding={(code) => {
              handleRemoveBinding(binding.scriptId, code);
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

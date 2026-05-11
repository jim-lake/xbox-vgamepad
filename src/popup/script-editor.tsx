import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
} from '@/components/base_components';
import IconButton from '@/components/buttons/icon_button';
import TextButton from '@/components/buttons/text_button';
import Select from '@/components/select';
import type {
  GamepadKeyboardConfig,
  GameScript,
  ScriptAction,
  GamepadActionName,
} from '@/types/gamepad';
import {
  extractScripts,
  replaceScript,
  removeScript,
  addScript,
  displayKeyCode,
} from './script-helpers';
import type { ScriptEntry } from './script-helpers';

import closeIcon from '@/assets/img/close.svg';
import plusIcon from '@/assets/img/plus.svg';

// ── action labels ─────────────────────────────────────────────────────────────

const ACTION_NAMES: GamepadActionName[] = [
  'a',
  'b',
  'x',
  'y',
  'leftShoulder',
  'rightShoulder',
  'leftTrigger',
  'rightTrigger',
  'select',
  'start',
  'dpadUp',
  'dpadDown',
  'dpadLeft',
  'dpadRight',
  'leftStickPressed',
  'rightStickPressed',
  'leftStickUp',
  'leftStickDown',
  'leftStickLeft',
  'leftStickRight',
  'rightStickUp',
  'rightStickDown',
  'rightStickLeft',
  'rightStickRight',
  'home',
];

const ACTION_LABEL: Record<GamepadActionName, string> = {
  a: 'A',
  b: 'B',
  x: 'X',
  y: 'Y',
  leftShoulder: 'LB',
  rightShoulder: 'RB',
  leftTrigger: 'LT',
  rightTrigger: 'RT',
  select: 'Select',
  start: 'Start',
  dpadUp: 'D-Up',
  dpadDown: 'D-Down',
  dpadLeft: 'D-Left',
  dpadRight: 'D-Right',
  leftStickPressed: 'LS Press',
  rightStickPressed: 'RS Press',
  leftStickUp: 'LS Up',
  leftStickDown: 'LS Down',
  leftStickLeft: 'LS Left',
  leftStickRight: 'LS Right',
  rightStickUp: 'RS Up',
  rightStickDown: 'RS Down',
  rightStickLeft: 'RS Left',
  rightStickRight: 'RS Right',
  home: 'Home',
  toggleGamepad: 'Toggle Gamepad',
  toggleAllGamepads: 'Toggle All Gamepads',
  toggleExtension: 'Toggle Extension',
};

const ACTIVATION_OPTIONS = [
  { value: 'on_down', text: 'On Down' },
  { value: 'on_up', text: 'On Up' },
  { value: 'toggle', text: 'Toggle' },
  { value: 'held', text: 'Held' },
] as const;

// ── styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: '0.5rem',
    paddingBottom: '0.5rem',
    borderBottomWidth: 1,
    borderBottomColor: 'var(--row-border)',
  },
  label: { width: '10rem', color: 'var(--text-muted)', fontSize: '1.4rem' },
  bindings: {
    flex: 1,
    flexDirection: 'row',
    gap: '0.4rem',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  badge: {
    backgroundColor: 'var(--chip-bg)',
    paddingLeft: '1rem',
    paddingRight: '1rem',
    paddingTop: '0.2rem',
    paddingBottom: '0.2rem',
    borderRadius: '1rem',
    flexDirection: 'row',
    alignItems: 'center',
  },
  badgeText: { color: 'var(--text-primary)', fontSize: '1.3rem' },
  deleteBtn: { marginLeft: '0.9rem' },
  addBtn: { marginLeft: '0.4rem' },
  // Edit mode
  editBox: {
    flexDirection: 'column',
    borderBottomWidth: 1,
    borderBottomColor: 'var(--row-border)',
    paddingTop: '0.5rem',
    paddingBottom: '0.8rem',
    gap: '0.5rem',
  },
  editRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: '0.5rem',
    paddingTop: '0.2rem',
    paddingBottom: '0.2rem',
  },
  editLabel: { width: '8rem', color: 'var(--text-muted)', fontSize: '1.3rem' },
  nameInput: {
    flex: 1,
    color: 'var(--text-primary)',
    fontSize: '1.4rem',
    borderWidth: 1,
    borderRadius: '0.4rem',
    padding: '0.2rem 0.5rem',
    backgroundColor: 'var(--app-bg)',
  },
  select: {
    padding: '2px 4px 2px 6px',
    color: 'var(--text-muted)',
    fontSize: '1.3rem',
    appearance: 'auto',
    borderWidth: 1,
    borderRadius: 6,
    backgroundColor: '#fefefe',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: '0.4rem',
    paddingLeft: '0.5rem',
  },
  actionRowLabel: {
    color: 'var(--text-muted)',
    fontSize: '1.3rem',
    width: '3rem',
  },
  doneRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: '0.5rem',
    paddingTop: '0.4rem',
  },
  modal: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'var(--modal-overlay)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: 'var(--app-bg)',
    padding: '2rem',
    borderRadius: '1rem',
    alignItems: 'center',
  },
  modalText: {
    color: 'var(--text-primary)',
    fontSize: '1.4rem',
    marginBottom: '1rem',
  },
  modalSub: { color: 'var(--text-muted)', fontSize: '1.3rem' },
  addScriptRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingTop: '0.5rem',
  },
});

// ── ScriptActionList / ScriptActionRow (recursive) ───────────────────────────

// Forward-declare so ScriptActionRow can reference ScriptActionList recursively.
function ScriptActionList(props: {
  actions: ScriptAction[];
  gamepadIndex: 0 | 1 | 2 | 3;
  indent: number;
  onChange: (actions: ScriptAction[]) => void;
}): React.ReactElement {
  const { actions, gamepadIndex, indent, onChange } = props;

  function handleChange(i: number, action: ScriptAction) {
    onChange(actions.map((a, idx) => (idx === i ? action : a)));
  }

  function handleRemove(i: number) {
    onChange(actions.filter((_, idx) => idx !== i));
  }

  function handleAdd() {
    onChange([
      ...actions,
      {
        type: 'down',
        buttons: [{ type: 'action', gamepadIndex, action: 'a' }],
      },
    ]);
  }

  return (
    <View style={{ flexDirection: 'column', gap: '0.2rem' }}>
      {actions.map((action, i) => (
        <ScriptActionRow
          key={i}
          action={action}
          index={i}
          gamepadIndex={gamepadIndex}
          indent={indent}
          onChange={handleChange}
          onRemove={handleRemove}
        />
      ))}
      <View
        style={[
          styles.actionRow,
          { paddingLeft: `${String(indent * 1.5 + 0.5)}rem` },
        ]}
      >
        <IconButton source={plusIcon} type='green' onPress={handleAdd} />
        <Text style={{ color: 'var(--text-muted)', fontSize: '1.3rem' }}>
          Add action
        </Text>
      </View>
    </View>
  );
}

interface ScriptActionRowProps {
  action: ScriptAction;
  index: number;
  gamepadIndex: 0 | 1 | 2 | 3;
  indent: number;
  onChange: (index: number, action: ScriptAction) => void;
  onRemove: (index: number) => void;
}

const TYPE_OPTIONS = [
  { value: 'down', text: 'Down' },
  { value: 'up', text: 'Up' },
  { value: 'delay', text: 'Delay' },
  { value: 'loop', text: 'Loop' },
];

function ScriptActionRow({
  action,
  index,
  gamepadIndex,
  indent,
  onChange,
  onRemove,
}: ScriptActionRowProps) {
  const indentStyle = { paddingLeft: `${String(indent * 1.5 + 0.5)}rem` };

  function handleTypeChange(val: string) {
    if (val === 'delay') {
      onChange(index, { type: 'delay', durationMs: 100 });
    } else if (val === 'down' || val === 'up') {
      onChange(index, {
        type: val,
        buttons: [{ type: 'action', gamepadIndex, action: 'a' }],
      });
    } else if (val === 'loop') {
      onChange(index, { type: 'loop', count: 1, actions: [] });
    }
  }

  if (action.type === 'delay') {
    return (
      <View style={[styles.actionRow, indentStyle]}>
        <Text style={styles.actionRowLabel}>#{String(index + 1)}</Text>
        <Select
          style={styles.select}
          value={action.type}
          options={TYPE_OPTIONS}
          onChange={handleTypeChange}
        />
        <TextInput
          style={[styles.nameInput, { width: '5rem' }]}
          value={String(action.durationMs)}
          onChangeText={(v) => {
            const n = parseInt(v, 10);
            if (!isNaN(n) && n >= 0) {
              onChange(index, { type: 'delay', durationMs: n });
            }
          }}
        />
        <Text style={{ color: 'var(--text-muted)', fontSize: '1.3rem' }}>
          ms
        </Text>
        <IconButton
          source={closeIcon}
          type='danger'
          onPress={() => {
            onRemove(index);
          }}
        />
      </View>
    );
  }

  if (action.type === 'loop') {
    const countIsInfinite = action.count === 'infinite';
    return (
      <View style={{ flexDirection: 'column' }}>
        <View style={[styles.actionRow, indentStyle]}>
          <Text style={styles.actionRowLabel}>#{String(index + 1)}</Text>
          <Select
            style={styles.select}
            value={action.type}
            options={TYPE_OPTIONS}
            onChange={handleTypeChange}
          />
          <Text style={{ color: 'var(--text-muted)', fontSize: '1.3rem' }}>
            ×
          </Text>
          {countIsInfinite ? (
            <Text
              style={{
                color: 'var(--text-muted)',
                fontSize: '1.3rem',
                width: '5rem',
              }}
            >
              ∞
            </Text>
          ) : (
            <TextInput
              style={[styles.nameInput, { width: '5rem' }]}
              value={String(action.count)}
              onChangeText={(v) => {
                const n = parseInt(v, 10);
                if (!isNaN(n) && n >= 1) {
                  onChange(index, { ...action, count: n });
                }
              }}
            />
          )}
          <Select
            style={styles.select}
            value={countIsInfinite ? 'infinite' : 'finite'}
            options={[
              { value: 'finite', text: 'times' },
              { value: 'infinite', text: '∞' },
            ]}
            onChange={(v) => {
              onChange(index, {
                ...action,
                count:
                  v === 'infinite'
                    ? 'infinite'
                    : typeof action.count === 'number'
                      ? action.count
                      : 1,
              });
            }}
          />
          <IconButton
            source={closeIcon}
            type='danger'
            onPress={() => {
              onRemove(index);
            }}
          />
        </View>
        <ScriptActionList
          actions={action.actions}
          gamepadIndex={gamepadIndex}
          indent={indent + 1}
          onChange={(nested) => {
            onChange(index, { ...action, actions: nested });
          }}
        />
      </View>
    );
  }

  // down / up — delay and loop are handled above, only 'down' | 'up' remain
  const btn = action.buttons[0] ?? {
    type: 'action' as const,
    gamepadIndex,
    action: 'a' as GamepadActionName,
  };
  return (
    <View style={[styles.actionRow, indentStyle]}>
      <Text style={styles.actionRowLabel}>#{String(index + 1)}</Text>
      <Select
        style={styles.select}
        value={action.type}
        options={TYPE_OPTIONS}
        onChange={handleTypeChange}
      />
      <Select
        style={styles.select}
        value={btn.action}
        options={ACTION_NAMES.map((a) => ({ value: a, text: ACTION_LABEL[a] }))}
        onChange={(v) => {
          onChange(index, {
            type: action.type,
            buttons: [{ ...btn, gamepadIndex, action: v as GamepadActionName }],
          });
        }}
      />
      <IconButton
        source={closeIcon}
        type='danger'
        onPress={() => {
          onRemove(index);
        }}
      />
    </View>
  );
}

// ── ScriptEditBox ─────────────────────────────────────────────────────────────

interface ScriptEditBoxProps {
  script: GameScript;
  gamepadIndex: 0 | 1 | 2 | 3;
  onChange: (script: GameScript) => void;
  onDone: () => void;
  onDelete: () => void;
}

function ScriptEditBox({
  script,
  gamepadIndex,
  onChange,
  onDone,
  onDelete,
}: ScriptEditBoxProps) {
  return (
    <View style={styles.editBox}>
      <View style={styles.editRow}>
        <Text style={styles.editLabel}>Name</Text>
        <TextInput
          style={styles.nameInput}
          value={script.name}
          onChangeText={(v) => {
            onChange({ ...script, name: v });
          }}
        />
      </View>
      <View style={styles.editRow}>
        <Text style={styles.editLabel}>Activation</Text>
        <Select
          style={styles.select}
          value={script.activationType}
          options={[...ACTIVATION_OPTIONS]}
          onChange={(v) => {
            onChange({
              ...script,
              activationType: v as GameScript['activationType'],
            });
          }}
        />
      </View>
      <ScriptActionList
        actions={script.actions}
        gamepadIndex={gamepadIndex}
        indent={0}
        onChange={(actions) => {
          onChange({ ...script, actions });
        }}
      />
      <View style={styles.doneRow}>
        <TextButton text='Delete' type='danger' onPress={onDelete} />
        <TextButton text='Done' type='blue' onPress={onDone} />
      </View>
    </View>
  );
}

// ── ScriptRow (view mode) ─────────────────────────────────────────────────────

interface ScriptRowProps {
  entry: ScriptEntry;
  onEdit: () => void;
  onAddBinding: () => void;
  onRemoveBinding: () => void;
}

function ScriptRow({
  entry,
  onEdit,
  onAddBinding,
  onRemoveBinding,
}: ScriptRowProps) {
  const boundKey = displayKeyCode(entry.keyCode);
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{entry.script.name || '(unnamed)'}</Text>
      <View style={styles.bindings}>
        {boundKey !== null && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{boundKey}</Text>
            <IconButton
              style={styles.deleteBtn}
              source={closeIcon}
              type='danger'
              onPress={onRemoveBinding}
            />
          </View>
        )}
        <IconButton
          style={styles.addBtn}
          source={plusIcon}
          type='green'
          onPress={onAddBinding}
        />
      </View>
      <TextButton text='Edit' type='ghost' onPress={onEdit} />
    </View>
  );
}

// ── ScriptEditor (main export) ────────────────────────────────────────────────

function copyScriptForSlot(
  script: GameScript,
  slotIndex: 0 | 1 | 2 | 3
): GameScript {
  return { ...script, actions: remapActions(script.actions, slotIndex) };
}

function remapActions(
  actions: ScriptAction[],
  slotIndex: 0 | 1 | 2 | 3
): ScriptAction[] {
  return actions.map((a) => {
    if (a.type === 'down' || a.type === 'up') {
      return {
        ...a,
        buttons: a.buttons.map((b) => ({ ...b, gamepadIndex: slotIndex })),
      };
    }
    if (a.type === 'loop') {
      return { ...a, actions: remapActions(a.actions, slotIndex) };
    }
    return a;
  });
}

interface Props {
  keyboardConfig: GamepadKeyboardConfig;
  gamepadIndex: 0 | 1 | 2 | 3;
  onChange: (keyboardConfig: GamepadKeyboardConfig) => void;
}

export default function ScriptEditor({
  keyboardConfig,
  gamepadIndex,
  onChange,
}: Props) {
  const [editingScript, setEditingScript] = React.useState<GameScript | null>(
    null
  );
  const [listening, setListening] = React.useState<ScriptEntry | null>(null);

  const entries = React.useMemo(
    () => extractScripts(keyboardConfig),
    [keyboardConfig]
  );

  // Key-capture for binding
  React.useEffect(() => {
    if (listening === null) {
      return;
    }
    const entry = listening;

    function handleKeyDown(e: KeyboardEvent) {
      e.preventDefault();
      e.stopPropagation();
      if (e.code === 'Escape') {
        setListening(null);
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
      setListening(null);
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
      setListening(null);
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
  }, [listening, keyboardConfig, gamepadIndex, onChange]);

  function handleAdd() {
    const script: GameScript = {
      type: 'script',
      name: 'New Script',
      activationType: 'on_down',
      actions: [],
    };
    onChange(addScript(keyboardConfig, script));
    setEditingScript(script);
  }

  function handleScriptChange(newScript: GameScript) {
    const entry = entries.find((e) => e.script === editingScript);
    if (!entry) {
      return;
    }
    onChange(replaceScript(keyboardConfig, entry, entry.keyCode, newScript));
    setEditingScript(newScript);
  }

  function handleRemoveBinding(entry: ScriptEntry) {
    // Pick a sentinel that isn't the entry's current key
    let sentinel = '__script__';
    let i = 0;
    while (sentinel in keyboardConfig && sentinel !== entry.keyCode) {
      i++;
      sentinel = `__script__${String(i)}`;
    }
    onChange(replaceScript(keyboardConfig, entry, sentinel, entry.script));
  }

  return (
    <View style={{ flexDirection: 'column' }}>
      {entries.map((entry) => {
        const isEditing =
          editingScript !== null && entry.script === editingScript;
        if (isEditing) {
          return (
            <ScriptEditBox
              key={entry.keyCode}
              script={entry.script}
              gamepadIndex={gamepadIndex}
              onChange={(s) => {
                handleScriptChange(s);
              }}
              onDone={() => {
                setEditingScript(null);
              }}
              onDelete={() => {
                const e = entries.find((en) => en.script === editingScript);
                if (e) {
                  onChange(removeScript(keyboardConfig, e));
                }
                setEditingScript(null);
              }}
            />
          );
        }
        return (
          <ScriptRow
            key={entry.keyCode}
            entry={entry}
            onEdit={() => {
              setEditingScript(entry.script);
            }}
            onAddBinding={() => {
              setListening(entry);
            }}
            onRemoveBinding={() => {
              handleRemoveBinding(entry);
            }}
          />
        );
      })}

      <View style={styles.addScriptRow}>
        <TextButton text='Add Script' type='green' onPress={handleAdd} />
      </View>

      {listening !== null && (
        <View style={styles.modal}>
          <View style={styles.modalContent}>
            <Text style={styles.modalText}>Press a key or mouse button</Text>
            <Text style={styles.modalSub}>Escape to cancel</Text>
          </View>
        </View>
      )}
    </View>
  );
}

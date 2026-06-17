import React, { useState } from 'react';
import { StyleSheet, Text, View } from '@/components/base_components';
import IconButton from '@/components/buttons/icon_button';
import Select from '@/components/select';
import Switch from '@/components/switch';
import NumberInput from '@/components/number-input';
import { Badge } from '@/components/popup/binding-badges';
import KeyCaptureModal from '@/components/popup/key-capture-modal';
import type { GamepadActionName } from '@/types/gamepad';
import type { PopupScriptAction } from '@/types/popup';
import { TYPE_OPTIONS, ACTION_OPTIONS } from '@/popup/script-constants';
import { formatCode } from '@/popup/script-helpers';
import StickInput from '@/components/popup/stick-input';

import closeIcon from '@/assets/img/close.svg';

const STICK_OPTIONS = [
  { value: 'left', text: 'Left' },
  { value: 'right', text: 'Right' },
];

const DIR_OPTIONS = [
  { value: '4', text: '4' },
  { value: '8', text: '8' },
  { value: 'infinite', text: 'Smooth' },
];

const styles = StyleSheet.create({
  container: { flexDirection: 'column', paddingTop: '0.5rem' },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: '0.4rem' },
  params: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: '0.4rem',
    paddingLeft: '1.2rem',
    paddingTop: '0.3rem',
    paddingBottom: '1rem',
  },
  loopContainer: { flexDirection: 'column', paddingTop: '0.5rem' },
  loopBody: {
    borderLeftWidth: 1,
    borderLeftColor: 'var(--row-border)',
    borderLeftStyle: 'solid',
    borderTopWidth: 1,
    borderTopColor: 'var(--row-border)',
    borderTopStyle: 'solid',
    borderBottomWidth: 1,
    borderBottomColor: 'var(--row-border)',
    borderBottomStyle: 'solid',
    paddingLeft: '10px',
    marginLeft: '10px',
  },
  numInput: {
    color: 'var(--text-primary)',
    fontSize: '1.4rem',
    borderWidth: 1,
    borderRadius: '0.4rem',
    padding: '0.4rem 0.5rem',
    backgroundColor: 'var(--input-bg)',
    width: '7rem',
  },
  paramLabel: {
    color: 'var(--text-muted)',
    fontSize: '1.3rem',
    marginRight: '1rem',
    width: '8rem',
  },
  buttonList: {
    flexDirection: 'row',
    gap: '0.4rem',
    flex: 1,
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  spacer: { flex: 1 },
  disabled: { opacity: 0.4, pointerEvents: 'none' as const },
  addKeyBtn: { cursor: 'pointer' as const },
});

interface ActionHeaderProps {
  value: string;
  onTypeChange: (val: string) => void;
  onRemove: () => void;
}

function ActionHeader({ value, onTypeChange, onRemove }: ActionHeaderProps) {
  return (
    <View style={styles.headerRow}>
      <Select value={value} options={TYPE_OPTIONS} onChange={onTypeChange} />
      <View style={styles.spacer} />
      <IconButton source={closeIcon} type='danger' onPress={onRemove} />
    </View>
  );
}

interface ButtonPickerProps {
  buttons: { action: GamepadActionName }[];
  gamepadIndex: 0 | 1 | 2 | 3;
  addOptions: { value: string; text: string; disabled?: boolean }[];
  onRemoveButton: (bi: number) => void;
  onAddButton: (action: GamepadActionName) => void;
}

function ButtonPicker({
  buttons,
  addOptions,
  gamepadIndex: _gamepadIndex,
  onRemoveButton,
  onAddButton,
}: ButtonPickerProps) {
  const usedActions = new Set(buttons.map((b) => b.action));
  return (
    <View style={styles.buttonList}>
      {buttons.map((btn, bi) => (
        <Badge
          key={bi}
          text={
            ACTION_OPTIONS.find((o) => o.value === btn.action)?.text ??
            btn.action
          }
          onRemove={() => {
            onRemoveButton(bi);
          }}
        />
      ))}
      <Select
        value=''
        placeholder='Pick Key'
        options={addOptions}
        onChange={(v) => {
          if (!usedActions.has(v as GamepadActionName)) {
            onAddButton(v as GamepadActionName);
          }
        }}
      />
    </View>
  );
}

interface KeysPickerProps {
  keys: string[];
  onRemove: (index: number) => void;
  onAdd: (code: string) => void;
}

function KeysPicker({ keys, onRemove, onAdd }: KeysPickerProps) {
  const [capturing, setCapturing] = useState(false);

  React.useEffect(() => {
    if (!capturing) {
      return;
    }
    function handler(e: KeyboardEvent) {
      e.preventDefault();
      e.stopPropagation();
      if (e.code === 'Escape') {
        setCapturing(false);
        return;
      }
      onAdd(e.code);
      setCapturing(false);
    }
    document.addEventListener('keydown', handler, true);
    return () => {
      document.removeEventListener('keydown', handler, true);
    };
  }, [capturing, onAdd]);

  return (
    <View style={styles.buttonList}>
      {keys.map((code, i) => (
        <Badge
          key={i}
          text={formatCode(code)}
          onRemove={() => {
            onRemove(i);
          }}
        />
      ))}
      {capturing ? (
        <KeyCaptureModal
          onClose={() => {
            setCapturing(false);
          }}
        />
      ) : null}
      <View
        style={styles.addKeyBtn}
        onClick={() => {
          setCapturing(true);
        }}
      >
        <Text style={styles.paramLabel}>+ Add</Text>
      </View>
    </View>
  );
}

export interface ScriptActionRowProps {
  action: PopupScriptAction;
  index: number;
  gamepadIndex: 0 | 1 | 2 | 3;
  pressedKeys: Set<GamepadActionName>;
  disabled?: boolean;
  onChange: (index: number, action: PopupScriptAction) => void;
  onRemove: (index: number) => void;
  renderActionList: (
    actions: PopupScriptAction[],
    pressedKeys: Set<GamepadActionName>,
    onChange: (actions: PopupScriptAction[]) => void
  ) => React.ReactNode;
}

export default function ScriptActionRow({
  action,
  index,
  gamepadIndex,
  pressedKeys,
  disabled = false,
  onChange,
  onRemove,
  renderActionList,
}: ScriptActionRowProps) {
  function handleTypeChange(val: string) {
    if (val === 'tap') {
      const existingButtons =
        action.type === 'down' ||
        action.type === 'up' ||
        action.type === 'tap' ||
        action.type === 'hold'
          ? action.buttons
          : [];
      onChange(index, {
        type: 'tap',
        buttons: existingButtons,
        durationMs: 100,
      });
    } else if (val === 'turbo') {
      const existingButtons =
        action.type === 'down' ||
        action.type === 'up' ||
        action.type === 'tap' ||
        action.type === 'turbo' ||
        action.type === 'hold'
          ? action.buttons
          : [];
      onChange(index, { type: 'turbo', buttons: existingButtons, speed: 100 });
    } else if (val === 'hold') {
      const existingButtons =
        action.type === 'down' ||
        action.type === 'up' ||
        action.type === 'tap' ||
        action.type === 'turbo' ||
        action.type === 'hold'
          ? action.buttons
          : [];
      onChange(index, { type: 'hold', buttons: existingButtons });
    } else if (val === 'suspend') {
      onChange(index, { type: 'suspend' });
    } else if (val === 'delay') {
      onChange(index, { type: 'delay', durationMs: 100 });
    } else if (val === 'down' || val === 'up') {
      onChange(index, { type: val, buttons: [] });
    } else if (val === 'loop') {
      onChange(index, {
        type: 'loop',
        count: 1,
        actions: action.type === 'loop' ? action.actions : [],
      });
    } else if (val === 'loop_forever') {
      onChange(index, {
        type: 'loop',
        count: 'infinite',
        actions: action.type === 'loop' ? action.actions : [],
      });
    } else if (val === 'point') {
      onChange(index, {
        type: 'point',
        gamepadIndex,
        stick: 'left',
        x: 0,
        y: -1,
      });
    } else if (val === 'rotate') {
      onChange(index, {
        type: 'rotate',
        gamepadIndex,
        stick: 'left',
        startX: 0,
        startY: 1,
        endX: 0,
        endY: 1,
        directions: 8,
        rotateMs: 500,
        clockwise: true,
      });
    } else if (val === 'key_tap') {
      const existingKeys =
        action.type === 'key_down' ||
        action.type === 'key_up' ||
        action.type === 'key_tap' ||
        action.type === 'key_turbo' ||
        action.type === 'key_hold'
          ? action.keys
          : [];
      onChange(index, { type: 'key_tap', keys: existingKeys, durationMs: 50 });
    } else if (val === 'key_turbo') {
      const existingKeys =
        action.type === 'key_down' ||
        action.type === 'key_up' ||
        action.type === 'key_tap' ||
        action.type === 'key_turbo' ||
        action.type === 'key_hold'
          ? action.keys
          : [];
      onChange(index, { type: 'key_turbo', keys: existingKeys, speed: 100 });
    } else if (val === 'key_hold') {
      const existingKeys =
        action.type === 'key_down' ||
        action.type === 'key_up' ||
        action.type === 'key_tap' ||
        action.type === 'key_turbo' ||
        action.type === 'key_hold'
          ? action.keys
          : [];
      onChange(index, { type: 'key_hold', keys: existingKeys });
    } else if (val === 'key_down' || val === 'key_up') {
      const existingKeys =
        action.type === 'key_down' ||
        action.type === 'key_up' ||
        action.type === 'key_tap' ||
        action.type === 'key_turbo' ||
        action.type === 'key_hold'
          ? action.keys
          : [];
      onChange(index, { type: val, keys: existingKeys });
    }
  }

  const wrap = disabled ? styles.disabled : undefined;

  if (action.type === 'tap') {
    const { buttons } = action;
    const usedActions = new Set(buttons.map((b) => b.action));
    return (
      <View style={[styles.container, wrap]}>
        <ActionHeader
          value='tap'
          onTypeChange={handleTypeChange}
          onRemove={() => {
            onRemove(index);
          }}
        />
        <View style={styles.params}>
          <Text style={styles.paramLabel}>Milliseconds</Text>
          <NumberInput
            style={styles.numInput}
            value={action.durationMs}
            min={0}
            onChange={(n) => {
              onChange(index, { ...action, durationMs: n });
            }}
          />
        </View>
        <View style={styles.params}>
          <Text style={styles.paramLabel}>Buttons</Text>
          <ButtonPicker
            buttons={buttons}
            gamepadIndex={gamepadIndex}
            addOptions={ACTION_OPTIONS.map((o) => ({
              ...o,
              disabled: usedActions.has(o.value),
            }))}
            onRemoveButton={(bi) => {
              onChange(index, {
                ...action,
                buttons: buttons.filter((_, j) => j !== bi),
              });
            }}
            onAddButton={(a) => {
              onChange(index, {
                ...action,
                buttons: [
                  ...buttons,
                  { type: 'action', gamepadIndex, action: a },
                ],
              });
            }}
          />
        </View>
      </View>
    );
  }

  if (action.type === 'turbo') {
    const { buttons } = action;
    const usedActions = new Set(buttons.map((b) => b.action));
    return (
      <View style={[styles.container, wrap]}>
        <ActionHeader
          value='turbo'
          onTypeChange={handleTypeChange}
          onRemove={() => {
            onRemove(index);
          }}
        />
        <View style={styles.params}>
          <Text style={styles.paramLabel}>Speed (ms)</Text>
          <NumberInput
            style={styles.numInput}
            value={action.speed}
            min={64}
            max={150}
            integer
            onChange={(n) => {
              onChange(index, { ...action, speed: n });
            }}
          />
        </View>
        <View style={styles.params}>
          <Text style={styles.paramLabel}>Buttons</Text>
          <ButtonPicker
            buttons={buttons}
            gamepadIndex={gamepadIndex}
            addOptions={ACTION_OPTIONS.map((o) => ({
              ...o,
              disabled: usedActions.has(o.value),
            }))}
            onRemoveButton={(bi) => {
              onChange(index, {
                ...action,
                buttons: buttons.filter((_, j) => j !== bi),
              });
            }}
            onAddButton={(a) => {
              onChange(index, {
                ...action,
                buttons: [
                  ...buttons,
                  { type: 'action', gamepadIndex, action: a },
                ],
              });
            }}
          />
        </View>
      </View>
    );
  }

  if (action.type === 'delay') {
    return (
      <View style={[styles.container, wrap]}>
        <ActionHeader
          value='delay'
          onTypeChange={handleTypeChange}
          onRemove={() => {
            onRemove(index);
          }}
        />
        <View style={styles.params}>
          <Text style={styles.paramLabel}>Milliseconds</Text>
          <NumberInput
            style={styles.numInput}
            value={action.durationMs as number}
            min={0}
            onChange={(n) => {
              onChange(index, { type: 'delay', durationMs: n });
            }}
          />
        </View>
      </View>
    );
  }

  if (action.type === 'loop') {
    const isForever = action.count === 'infinite';
    return (
      <View style={[styles.loopContainer, wrap]}>
        <ActionHeader
          value={isForever ? 'loop_forever' : 'loop'}
          onTypeChange={handleTypeChange}
          onRemove={() => {
            onRemove(index);
          }}
        />
        {!isForever && (
          <View style={styles.params}>
            <Text style={styles.paramLabel}>Times</Text>
            <NumberInput
              style={styles.numInput}
              value={action.count as number}
              min={1}
              integer
              onChange={(n) => {
                onChange(index, { ...action, count: n });
              }}
            />
          </View>
        )}
        <View style={styles.loopBody}>
          {renderActionList(action.actions, pressedKeys, (nested) => {
            onChange(index, { ...action, actions: nested });
          })}
        </View>
      </View>
    );
  }

  if (action.type === 'hold') {
    const { buttons } = action;
    const usedActions = new Set(buttons.map((b) => b.action));
    return (
      <View style={[styles.container, wrap]}>
        <ActionHeader
          value='hold'
          onTypeChange={handleTypeChange}
          onRemove={() => {
            onRemove(index);
          }}
        />
        <View style={styles.params}>
          <Text style={styles.paramLabel}>Buttons</Text>
          <ButtonPicker
            buttons={buttons}
            gamepadIndex={gamepadIndex}
            addOptions={ACTION_OPTIONS.map((o) => ({
              ...o,
              disabled: usedActions.has(o.value),
            }))}
            onRemoveButton={(bi) => {
              onChange(index, {
                ...action,
                buttons: buttons.filter((_, j) => j !== bi),
              });
            }}
            onAddButton={(a) => {
              onChange(index, {
                ...action,
                buttons: [
                  ...buttons,
                  { type: 'action', gamepadIndex, action: a },
                ],
              });
            }}
          />
        </View>
      </View>
    );
  }

  if (action.type === 'suspend') {
    return (
      <View style={[styles.container, wrap]}>
        <ActionHeader
          value='suspend'
          onTypeChange={handleTypeChange}
          onRemove={() => {
            onRemove(index);
          }}
        />
      </View>
    );
  }

  if (action.type === 'point') {
    return (
      <View style={[styles.container, wrap]}>
        <ActionHeader
          value='point'
          onTypeChange={handleTypeChange}
          onRemove={() => {
            onRemove(index);
          }}
        />
        <View style={styles.params}>
          <Text style={styles.paramLabel}>Stick</Text>
          <Select
            value={action.stick}
            options={STICK_OPTIONS}
            onChange={(v) => {
              onChange(index, { ...action, stick: v as 'left' | 'right' });
            }}
          />
        </View>
        <View style={styles.params}>
          <Text style={styles.paramLabel}>X/Y</Text>
          <StickInput
            value={{ x: action.x, y: action.y }}
            onChange={(pos) => {
              onChange(index, { ...action, x: pos.x, y: pos.y });
            }}
          />
        </View>
      </View>
    );
  }

  if (action.type === 'rotate') {
    return (
      <View style={[styles.container, wrap]}>
        <ActionHeader
          value='rotate'
          onTypeChange={handleTypeChange}
          onRemove={() => {
            onRemove(index);
          }}
        />
        <View style={styles.params}>
          <Text style={styles.paramLabel}>Stick</Text>
          <Select
            value={action.stick}
            options={STICK_OPTIONS}
            onChange={(v) => {
              onChange(index, { ...action, stick: v as 'left' | 'right' });
            }}
          />
        </View>
        <View style={styles.params}>
          <Text style={styles.paramLabel}>Clockwise</Text>
          <Switch
            value={action.clockwise}
            onValueChange={(v) => {
              onChange(index, { ...action, clockwise: v });
            }}
          />
        </View>
        <View style={styles.params}>
          <Text style={styles.paramLabel}>Start X/Y</Text>
          <StickInput
            value={{ x: action.startX, y: action.startY }}
            onChange={(pos) => {
              onChange(index, { ...action, startX: pos.x, startY: pos.y });
            }}
          />
        </View>
        <View style={styles.params}>
          <Text style={styles.paramLabel}>End X/Y</Text>
          <StickInput
            value={{ x: action.endX, y: action.endY }}
            onChange={(pos) => {
              onChange(index, { ...action, endX: pos.x, endY: pos.y });
            }}
          />
        </View>
        <View style={styles.params}>
          <Text style={styles.paramLabel}>Directions</Text>
          <Select
            value={String(action.directions)}
            options={DIR_OPTIONS}
            onChange={(v) => {
              const d = v === 'infinite' ? 'infinite' : (Number(v) as 4 | 8);
              onChange(index, { ...action, directions: d });
            }}
          />
        </View>
        <View style={styles.params}>
          <Text style={styles.paramLabel}>Duration (ms)</Text>
          <NumberInput
            style={styles.numInput}
            value={action.rotateMs}
            min={1}
            onChange={(n) => {
              onChange(index, { ...action, rotateMs: n });
            }}
          />
        </View>
      </View>
    );
  }

  if (
    action.type === 'key_tap' ||
    action.type === 'key_turbo' ||
    action.type === 'key_hold' ||
    action.type === 'key_down' ||
    action.type === 'key_up'
  ) {
    const headerValue =
      action.type === 'key_tap'
        ? 'key_tap'
        : action.type === 'key_turbo'
          ? 'key_turbo'
          : action.type === 'key_hold'
            ? 'key_hold'
            : action.type;
    return (
      <View style={[styles.container, wrap]}>
        <ActionHeader
          value={headerValue}
          onTypeChange={handleTypeChange}
          onRemove={() => {
            onRemove(index);
          }}
        />
        {action.type === 'key_tap' && (
          <View style={styles.params}>
            <Text style={styles.paramLabel}>Milliseconds</Text>
            <NumberInput
              style={styles.numInput}
              value={action.durationMs}
              min={0}
              onChange={(n) => {
                onChange(index, { ...action, durationMs: n });
              }}
            />
          </View>
        )}
        {action.type === 'key_turbo' && (
          <View style={styles.params}>
            <Text style={styles.paramLabel}>Speed (ms)</Text>
            <NumberInput
              style={styles.numInput}
              value={action.speed}
              min={64}
              integer
              onChange={(n) => {
                onChange(index, { ...action, speed: n });
              }}
            />
          </View>
        )}
        <View style={styles.params}>
          <Text style={styles.paramLabel}>Keys</Text>
          <KeysPicker
            keys={action.keys}
            onRemove={(ki) => {
              onChange(index, {
                ...action,
                keys: action.keys.filter((_: string, j: number) => j !== ki),
              });
            }}
            onAdd={(code) => {
              onChange(index, { ...action, keys: [...action.keys, code] });
            }}
          />
        </View>
      </View>
    );
  }

  const { buttons } = action;
  const usedActions = new Set(buttons.map((b) => b.action));
  return (
    <View style={[styles.container, wrap]}>
      <ActionHeader
        value={action.type}
        onTypeChange={handleTypeChange}
        onRemove={() => {
          onRemove(index);
        }}
      />
      <View style={styles.params}>
        <Text style={styles.paramLabel}>Keys</Text>
        <ButtonPicker
          buttons={buttons}
          gamepadIndex={gamepadIndex}
          addOptions={ACTION_OPTIONS.map((o) => ({
            ...o,
            disabled:
              usedActions.has(o.value) ||
              (action.type === 'up' && !pressedKeys.has(o.value)),
          }))}
          onRemoveButton={(bi) => {
            onChange(index, {
              type: action.type,
              buttons: buttons.filter((_, j) => j !== bi),
            });
          }}
          onAddButton={(a) => {
            onChange(index, {
              type: action.type,
              buttons: [
                ...buttons,
                { type: 'action' as const, gamepadIndex, action: a },
              ],
            });
          }}
        />
      </View>
    </View>
  );
}

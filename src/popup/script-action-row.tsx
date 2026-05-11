import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
} from '@/components/base_components';
import IconButton from '@/components/buttons/icon_button';
import Select from '@/components/select';
import type { ScriptAction, GamepadActionName } from '@/types/gamepad';
import { TYPE_OPTIONS, ACTION_OPTIONS, indentStyle } from './script-constants';

import closeIcon from '@/assets/img/close.svg';
import plusIcon from '@/assets/img/plus.svg';

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: '0.4rem',
    paddingTop: '0.5rem',
    paddingBottom: '0.5rem',
    borderBottomWidth: 1,
    borderBottomColor: 'var(--row-border)',
  },
  loopContainer: {
    flexDirection: 'column',
    borderBottomWidth: 1,
    borderBottomColor: 'var(--row-border)',
  },
  loopHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: '0.4rem',
    paddingTop: '0.5rem',
    paddingBottom: '0.5rem',
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
  delayInput: {
    color: 'var(--text-primary)',
    fontSize: '1.4rem',
    borderWidth: 1,
    borderRadius: '0.4rem',
    padding: '0.2rem 0.5rem',
    backgroundColor: 'var(--app-bg)',
    width: '5rem',
  },
  msLabel: { color: 'var(--text-muted)', fontSize: '1.3rem' },
  loopCountInput: {
    color: 'var(--text-primary)',
    fontSize: '1.4rem',
    borderWidth: 1,
    borderRadius: '0.4rem',
    padding: '0.2rem 0.5rem',
    backgroundColor: 'var(--app-bg)',
    width: '5rem',
  },
  loopTimesLabel: { color: 'var(--text-muted)', fontSize: '1.3rem' },
  buttonList: { flexDirection: 'column', gap: '0.2rem', flex: 1 },
  buttonRow: { flexDirection: 'row', alignItems: 'center', gap: '0.4rem' },
  addButtonRow: { flexDirection: 'row', alignItems: 'center', gap: '0.4rem' },
  addButtonLabel: { color: 'var(--text-muted)', fontSize: '1.3rem' },
});

export interface ScriptActionRowProps {
  action: ScriptAction;
  index: number;
  gamepadIndex: 0 | 1 | 2 | 3;
  indent: number;
  onChange: (index: number, action: ScriptAction) => void;
  onRemove: (index: number) => void;
  /** Render nested action list — injected to break circular module dependency. */
  renderActionList: (
    actions: ScriptAction[],
    indent: number,
    onChange: (actions: ScriptAction[]) => void
  ) => React.ReactNode;
}

export default function ScriptActionRow({
  action,
  index,
  gamepadIndex,
  indent,
  onChange,
  onRemove,
  renderActionList,
}: ScriptActionRowProps) {
  const ipad = indentStyle(indent);

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
      <View style={[styles.row, ipad]}>
        <Select
          style={styles.select}
          value={action.type}
          options={TYPE_OPTIONS}
          onChange={handleTypeChange}
        />
        <TextInput
          style={styles.delayInput}
          value={String(action.durationMs)}
          onChangeText={(v) => {
            const n = parseInt(v, 10);
            if (!isNaN(n) && n >= 0) {
              onChange(index, { type: 'delay', durationMs: n });
            }
          }}
        />
        <Text style={styles.msLabel}>ms</Text>
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
      <View style={styles.loopContainer}>
      <View style={[styles.loopHeaderRow, ipad]}>
          <Select
            style={styles.select}
            value={action.type}
            options={TYPE_OPTIONS}
            onChange={handleTypeChange}
          />
          <Text style={styles.loopTimesLabel}>×</Text>
          {countIsInfinite ? (
            <Text style={styles.loopTimesLabel}>∞</Text>
          ) : (
            <TextInput
              style={styles.loopCountInput}
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
        {renderActionList(action.actions, indent + 1, (nested) => {
          onChange(index, { ...action, actions: nested });
        })}
      </View>
    );
  }

  // down / up
  const { buttons } = action;
  return (
    <View style={[styles.row, ipad]}>
      <Select
        style={styles.select}
        value={action.type}
        options={TYPE_OPTIONS}
        onChange={handleTypeChange}
      />
      <View style={styles.buttonList}>
        {buttons.map((btn, bi) => (
          <View key={bi} style={styles.buttonRow}>
            <Select
              style={styles.select}
              value={btn.action}
              options={ACTION_OPTIONS}
              onChange={(v) => {
                const next = buttons.map((b, j) =>
                  j === bi
                    ? { ...b, gamepadIndex, action: v as GamepadActionName }
                    : b
                );
                onChange(index, { type: action.type, buttons: next });
              }}
            />
            {buttons.length > 1 && (
              <IconButton
                source={closeIcon}
                type='danger'
                onPress={() => {
                  const next = buttons.filter((_, j) => j !== bi);
                  onChange(index, { type: action.type, buttons: next });
                }}
              />
            )}
          </View>
        ))}
        <View style={styles.addButtonRow}>
          <IconButton
            source={plusIcon}
            type='green'
            onPress={() => {
              const next = [
                ...buttons,
                {
                  type: 'action' as const,
                  gamepadIndex,
                  action: 'a' as GamepadActionName,
                },
              ];
              onChange(index, { type: action.type, buttons: next });
            }}
          />
          <Text style={styles.addButtonLabel}>Add button</Text>
        </View>
      </View>
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

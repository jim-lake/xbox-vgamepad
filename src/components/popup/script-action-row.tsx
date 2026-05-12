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
import { TYPE_OPTIONS, ACTION_OPTIONS } from '@/popup/script-constants';

import closeIcon from '@/assets/img/close.svg';

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
  loopHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: '0.4rem' },
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
  select: {
    padding: '2px 4px 2px 6px',
    color: 'var(--text-primary)',
    fontSize: '1.3rem',
    appearance: 'auto',
    borderWidth: 1,
    borderRadius: 6,
    backgroundColor: 'var(--input-bg)',
  },
  delayInput: {
    color: 'var(--text-primary)',
    fontSize: '1.4rem',
    borderWidth: 1,
    borderRadius: '0.4rem',
    padding: '0.2rem 0.5rem',
    backgroundColor: 'var(--input-bg)',
    width: '5rem',
  },
  paramLabel: { color: 'var(--text-muted)', fontSize: '1.3rem' },
  loopCountInput: {
    color: 'var(--text-primary)',
    fontSize: '1.4rem',
    borderWidth: 1,
    borderRadius: '0.4rem',
    padding: '0.2rem 0.5rem',
    backgroundColor: 'var(--input-bg)',
    width: '5rem',
  },
  buttonList: {
    flexDirection: 'row',
    gap: '0.4rem',
    flex: 1,
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  spacer: { flex: 1 },
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
  badgeDelete: { marginLeft: '0.5rem' },
});

export interface ScriptActionRowProps {
  action: ScriptAction;
  index: number;
  gamepadIndex: 0 | 1 | 2 | 3;
  pressedKeys: Set<GamepadActionName>;
  onChange: (index: number, action: ScriptAction) => void;
  onRemove: (index: number) => void;
  renderActionList: (
    actions: ScriptAction[],
    pressedKeys: Set<GamepadActionName>,
    onChange: (actions: ScriptAction[]) => void
  ) => React.ReactNode;
}

export default function ScriptActionRow({
  action,
  index,
  gamepadIndex,
  pressedKeys,
  onChange,
  onRemove,
  renderActionList,
}: ScriptActionRowProps) {
  function handleTypeChange(val: string) {
    if (val === 'delay') {
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
    }
  }

  if (action.type === 'delay') {
    return (
      <View style={styles.container}>
        <View style={styles.headerRow}>
          <Select
            style={styles.select}
            value={action.type}
            options={TYPE_OPTIONS}
            onChange={handleTypeChange}
          />
          <View style={styles.spacer} />
          <IconButton
            source={closeIcon}
            type='danger'
            onPress={() => {
              onRemove(index);
            }}
          />
        </View>
        <View style={styles.params}>
          <Text style={styles.paramLabel}>Milliseconds:</Text>
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
        </View>
      </View>
    );
  }

  if (action.type === 'loop') {
    const isForever = action.count === 'infinite';
    return (
      <View style={styles.loopContainer}>
        <View style={styles.loopHeaderRow}>
          <Select
            style={styles.select}
            value={isForever ? 'loop_forever' : 'loop'}
            options={TYPE_OPTIONS}
            onChange={handleTypeChange}
          />
          <View style={styles.spacer} />
          <IconButton
            source={closeIcon}
            type='danger'
            onPress={() => {
              onRemove(index);
            }}
          />
        </View>
        {!isForever && (
          <View style={styles.params}>
            <Text style={styles.paramLabel}>Times:</Text>
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

  // down / up
  const { buttons } = action;
  const usedActions = new Set(buttons.map((b) => b.action));
  const addOptions = ACTION_OPTIONS.map((o) => ({
    ...o,
    disabled:
      usedActions.has(o.value) ||
      (action.type === 'up' && !pressedKeys.has(o.value)),
  }));
  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Select
          style={styles.select}
          value={action.type}
          options={TYPE_OPTIONS}
          onChange={handleTypeChange}
        />
        <View style={styles.spacer} />
        <IconButton
          source={closeIcon}
          type='danger'
          onPress={() => {
            onRemove(index);
          }}
        />
      </View>
      <View style={styles.params}>
        <Text style={styles.paramLabel}>Keys:</Text>
        <View style={styles.buttonList}>
          {buttons.map((btn, bi) => (
            <View key={bi} style={styles.badge}>
              <Text style={styles.badgeText}>
                {ACTION_OPTIONS.find((o) => o.value === btn.action)?.text ??
                  btn.action}
              </Text>
              <IconButton
                style={styles.badgeDelete}
                source={closeIcon}
                type='danger'
                onPress={() => {
                  const next = buttons.filter((_, j) => j !== bi);
                  onChange(index, { type: action.type, buttons: next });
                }}
              />
            </View>
          ))}
          <Select
            style={styles.select}
            value=''
            placeholder='Pick Key'
            options={addOptions}
            onChange={(v) => {
              if (usedActions.has(v as GamepadActionName)) {
                return;
              }
              const next = [
                ...buttons,
                {
                  type: 'action' as const,
                  gamepadIndex,
                  action: v as GamepadActionName,
                },
              ];
              onChange(index, { type: action.type, buttons: next });
            }}
          />
        </View>
      </View>
    </View>
  );
}

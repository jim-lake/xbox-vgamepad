import { StyleSheet, Text, View } from '@/components/base_components';
import IconButton from '@/components/buttons/icon_button';
import type { ScriptAction } from '@/types/gamepad';
import ScriptActionRow from './script-action-row';
import { indentStyle } from './script-constants';

import plusIcon from '@/assets/img/plus.svg';

const styles = StyleSheet.create({
  container: { flexDirection: 'column', gap: '0.2rem' },
  addRow: { flexDirection: 'row', alignItems: 'center', gap: '0.4rem' },
  addLabel: { color: 'var(--text-muted)', fontSize: '1.3rem' },
});

interface Props {
  actions: ScriptAction[];
  gamepadIndex: 0 | 1 | 2 | 3;
  indent: number;
  onChange: (actions: ScriptAction[]) => void;
}

export default function ScriptActionList({
  actions,
  gamepadIndex,
  indent,
  onChange,
}: Props) {
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
    <View style={styles.container}>
      {actions.map((action, i) => (
        <ScriptActionRow
          key={i}
          action={action}
          index={i}
          gamepadIndex={gamepadIndex}
          indent={indent}
          onChange={handleChange}
          onRemove={handleRemove}
          renderActionList={(nested, nestedIndent, nestedOnChange) => (
            <ScriptActionList
              actions={nested}
              gamepadIndex={gamepadIndex}
              indent={nestedIndent}
              onChange={nestedOnChange}
            />
          )}
        />
      ))}
      <View style={[styles.addRow, indentStyle(indent)]}>
        <IconButton source={plusIcon} type='green' onPress={handleAdd} />
        <Text style={styles.addLabel}>Add action</Text>
      </View>
    </View>
  );
}

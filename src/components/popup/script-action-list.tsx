import { StyleSheet, View } from '@/components/base_components';
import TextButton from '@/components/buttons/text_button';
import type { ScriptAction, GamepadActionName } from '@/types/gamepad';
import ScriptActionRow from './script-action-row';

const styles = StyleSheet.create({
  container: { flexDirection: 'column' },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: 'var(--row-border)',
    borderBottomStyle: 'solid',
  },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: '0.5rem',
    paddingBottom: '0.5rem',
  },
});

interface Props {
  actions: ScriptAction[];
  gamepadIndex: 0 | 1 | 2 | 3;
  parentPressedKeys?: Set<GamepadActionName>;
  onChange: (actions: ScriptAction[]) => void;
}

export default function ScriptActionList({
  actions,
  gamepadIndex,
  parentPressedKeys,
  onChange,
}: Props) {
  function handleChange(i: number, action: ScriptAction) {
    onChange(actions.map((a, idx) => (idx === i ? action : a)));
  }

  function handleRemove(i: number) {
    onChange(actions.filter((_, idx) => idx !== i));
  }

  function handleAdd() {
    onChange([...actions, { type: 'down', buttons: [] }]);
  }

  return (
    <View style={styles.container}>
      {actions.map((action, i) => {
        const pressed = new Set<GamepadActionName>(parentPressedKeys);
        for (let j = 0; j < i; j++) {
          const a = actions[j];
          if (a?.type === 'down') {
            for (const b of a.buttons) {
              pressed.add(b.action);
            }
          } else if (a?.type === 'up') {
            for (const b of a.buttons) {
              pressed.delete(b.action);
            }
          }
        }
        return (
          <View
            key={i}
            style={action.type !== 'loop' ? styles.rowBorder : undefined}
          >
            <ScriptActionRow
              action={action}
              index={i}
              gamepadIndex={gamepadIndex}
              pressedKeys={pressed}
              onChange={handleChange}
              onRemove={handleRemove}
              renderActionList={(nested, nestedPressed, nestedOnChange) => (
                <ScriptActionList
                  actions={nested}
                  gamepadIndex={gamepadIndex}
                  parentPressedKeys={nestedPressed}
                  onChange={nestedOnChange}
                />
              )}
            />
          </View>
        );
      })}
      <View style={styles.addRow}>
        <TextButton text='Add Action' type='green' onPress={handleAdd} />
      </View>
    </View>
  );
}

import {
  StyleSheet,
  Text,
  View,
  TextInput,
} from '@/components/base_components';
import TextButton from '@/components/buttons/text_button';
import Select from '@/components/select';
import type { GameScript } from '@/types/gamepad';
import ScriptActionList from './script-action-list';

const ACTIVATION_OPTIONS = [
  { value: 'on_down', text: 'On Down' },
  { value: 'on_up', text: 'On Up' },
  { value: 'toggle', text: 'Toggle' },
  { value: 'held', text: 'Held' },
] as const;

const styles = StyleSheet.create({
  container: {
    flexDirection: 'column',
    borderBottomWidth: 1,
    borderBottomColor: 'var(--row-border)',
    paddingTop: '0.5rem',
    paddingBottom: '0.8rem',
    gap: '0.5rem',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: '0.5rem',
    paddingTop: '0.2rem',
    paddingBottom: '0.2rem',
  },
  label: { width: '8rem', color: 'var(--text-muted)', fontSize: '1.3rem' },
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
  doneRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: '0.5rem',
    paddingTop: '0.4rem',
  },
});

interface Props {
  script: GameScript;
  gamepadIndex: 0 | 1 | 2 | 3;
  onChange: (script: GameScript) => void;
  onDone: () => void;
  onDelete: () => void;
}

export default function ScriptEditBox({
  script,
  gamepadIndex,
  onChange,
  onDone,
  onDelete,
}: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Text style={styles.label}>Name</Text>
        <TextInput
          style={styles.nameInput}
          value={script.name}
          onChangeText={(v) => {
            onChange({ ...script, name: v });
          }}
        />
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Activation</Text>
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

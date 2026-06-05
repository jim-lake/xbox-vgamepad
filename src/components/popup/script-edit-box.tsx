import { StyleSheet, View, TextInput } from '@/components/base_components';
import TextButton from '@/components/buttons/text_button';
import Select from '@/components/select';
import BindingBadges from './binding-badges';
import FormRow from './form-row';
import type { PopupGameScript } from '@/types/popup';
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
  },
  tallRow: { paddingTop: '1rem', paddingBottom: '1rem' },
  nameInput: {
    flex: 1,
    color: 'var(--text-primary)',
    fontSize: '1.4rem',
    borderWidth: 1,
    borderRadius: '0.4rem',
    padding: '0.4rem 0.5rem',
    backgroundColor: 'var(--input-bg)',
  },
  doneRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: '0.5rem',
    paddingTop: '0.4rem',
  },
  actionList: {
    borderLeftWidth: 1,
    borderLeftColor: 'var(--row-border)',
    borderBottomWidth: 1,
    borderBottomColor: 'var(--row-border)',
    paddingLeft: '1rem',
    paddingBottom: '1rem',
  },
});

interface Props {
  script: PopupGameScript;
  boundKeys: string[];
  gamepadIndex: 0 | 1 | 2 | 3;
  codeToLabels: Record<string, string[]>;
  onChange: (script: PopupGameScript) => void;
  onAddBinding: () => void;
  onRemoveBinding: (code: string) => void;
  onDone: () => void;
  onDelete: () => void;
}

export default function ScriptEditBox({
  script,
  boundKeys,
  gamepadIndex,
  codeToLabels,
  onChange,
  onAddBinding,
  onRemoveBinding,
  onDone,
  onDelete,
}: Props) {
  return (
    <View style={styles.container}>
      <FormRow label='Name' style={styles.tallRow}>
        <TextInput
          style={styles.nameInput}
          value={script.name}
          onChangeText={(v) => {
            onChange({ ...script, name: v });
          }}
        />
      </FormRow>
      <FormRow label='Buttons' style={styles.tallRow}>
        <BindingBadges
          codes={boundKeys}
          codeToLabels={codeToLabels}
          onAdd={onAddBinding}
          onRemove={onRemoveBinding}
        />
      </FormRow>
      <FormRow label='Activation' style={styles.tallRow}>
        <Select
          value={script.activationType}
          options={[...ACTIVATION_OPTIONS]}
          onChange={(v) => {
            onChange({
              ...script,
              activationType: v as PopupGameScript['activationType'],
            });
          }}
        />
      </FormRow>
      <View style={styles.actionList}>
        <ScriptActionList
          actions={script.actions}
          gamepadIndex={gamepadIndex}
          onChange={(actions) => {
            onChange({ ...script, actions });
          }}
        />
      </View>
      <View style={styles.doneRow}>
        <TextButton text='Delete' type='danger' onPress={onDelete} />
        <TextButton text='Done' type='blue' onPress={onDone} />
      </View>
    </View>
  );
}

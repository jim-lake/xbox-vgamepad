import { StyleSheet, Text, View } from '@/components/base_components';
import TextButton from '@/components/buttons/text_button';
import type { ScriptEntry } from './script-helpers';
import { isSentinelKey } from './script-helpers';
import BindingBadges from './binding-badges';

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
});

interface Props {
  entry: ScriptEntry;
  onEdit: () => void;
  onAddBinding: () => void;
  onRemoveBinding: (code: string) => void;
}

export default function ScriptRow({
  entry,
  onEdit,
  onAddBinding,
  onRemoveBinding,
}: Props) {
  const boundKeys = entry.keyCodes.filter((c) => !isSentinelKey(c));
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{entry.script.name || '(unnamed)'}</Text>
      <BindingBadges
        codes={boundKeys}
        onAdd={onAddBinding}
        onRemove={onRemoveBinding}
      />
      <TextButton text='Edit' type='ghost' onPress={onEdit} />
    </View>
  );
}

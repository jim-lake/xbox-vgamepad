import { StyleSheet, View } from '@/components/base_components';
import TextButton from '@/components/buttons/text_button';
import type { ScriptEntry } from '@/popup/script-helpers';
import { isSentinelKey } from '@/popup/script-helpers';
import BindingBadges from './binding-badges';
import FormRow from './form-row';

const styles = StyleSheet.create({
  right: { flexDirection: 'row', alignItems: 'center' },
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
    <FormRow label={entry.script.name || '(unnamed)'}>
      <BindingBadges
        codes={boundKeys}
        onAdd={onAddBinding}
        onRemove={onRemoveBinding}
      />
      <View style={styles.right}>
        <TextButton text='Edit' type='ghost' onPress={onEdit} />
      </View>
    </FormRow>
  );
}

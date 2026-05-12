import { StyleSheet, Text, View } from '@/components/base_components';
import Select from '@/components/select';
import TextButton from '@/components/buttons/text_button';

const styles = StyleSheet.create({
  presetNav: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: '1rem 1.5rem 0 1.5rem',
    backgroundColor: 'var(--surface-bg)',
  },
  label: {
    color: 'var(--text-primary)',
    fontSize: '1.4rem',
    fontWeight: '600',
  },
  select: { flex: 1, marginLeft: '1rem', marginRight: '2rem' },
});

interface Props {
  presetNames: string[];
  activeConfigName: string;
  onSelect: (name: string) => void;
  onAdd: () => void;
}

export default function PresetNav({
  presetNames,
  activeConfigName,
  onSelect,
  onAdd,
}: Props) {
  return (
    <View style={styles.presetNav}>
      <Text style={styles.label}>Profile</Text>
      <Select
        style={styles.select}
        value={activeConfigName}
        options={presetNames}
        onChange={onSelect}
      />
      <TextButton text='New Profile' onPress={onAdd} />
    </View>
  );
}

import { StyleSheet, Text, View } from '@/components/base_components';
import IconButton from '@/components/buttons/icon_button';
import TextButton from '@/components/buttons/text_button';
import type { ScriptEntry } from './script-helpers';
import { displayKeyCode, formatCode } from './script-helpers';

import closeIcon from '@/assets/img/close.svg';
import plusIcon from '@/assets/img/plus.svg';

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
  bindings: {
    flex: 1,
    flexDirection: 'row',
    gap: '0.4rem',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
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
  deleteBtn: { marginLeft: '0.9rem' },
  addBtn: { marginLeft: '0.4rem' },
});

interface Props {
  entry: ScriptEntry;
  onEdit: () => void;
  onAddBinding: () => void;
  onRemoveBinding: () => void;
}

export default function ScriptRow({
  entry,
  onEdit,
  onAddBinding,
  onRemoveBinding,
}: Props) {
  const boundKey = displayKeyCode(entry.keyCode);
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{entry.script.name || '(unnamed)'}</Text>
      <View style={styles.bindings}>
        {boundKey !== null && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{formatCode(boundKey)}</Text>
            <IconButton
              style={styles.deleteBtn}
              source={closeIcon}
              type='danger'
              onPress={onRemoveBinding}
            />
          </View>
        )}
        <IconButton
          style={styles.addBtn}
          source={plusIcon}
          type='green'
          onPress={onAddBinding}
        />
      </View>
      <TextButton text='Edit' type='ghost' onPress={onEdit} />
    </View>
  );
}

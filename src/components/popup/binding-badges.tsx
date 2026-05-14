import { StyleSheet, Text, View } from '@/components/base_components';
import IconButton from '@/components/buttons/icon_button';
import { formatCode } from '@/popup/script-helpers';

import closeIcon from '@/assets/img/close.svg';
import plusIcon from '@/assets/img/plus.svg';

const styles = StyleSheet.create({
  container: {
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

interface BadgeProps {
  text: string;
  onRemove: () => void;
}

export function Badge({ text, onRemove }: BadgeProps) {
  return (
    <View style={styles.badge}>
      <Text style={styles.badgeText}>{text}</Text>
      <IconButton
        style={styles.deleteBtn}
        source={closeIcon}
        type='danger'
        onPress={onRemove}
      />
    </View>
  );
}

interface Props {
  codes: string[];
  onAdd: () => void;
  onRemove: (code: string) => void;
}

export default function BindingBadges({ codes, onAdd, onRemove }: Props) {
  return (
    <View style={styles.container}>
      {codes.map((code) => (
        <Badge
          key={code}
          text={formatCode(code)}
          onRemove={() => {
            onRemove(code);
          }}
        />
      ))}
      <IconButton
        style={styles.addBtn}
        source={plusIcon}
        type='green'
        onPress={onAdd}
      />
    </View>
  );
}

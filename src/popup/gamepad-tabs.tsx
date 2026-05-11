import { StyleSheet, View } from '@/components/base_components';
import TextButton from '@/components/buttons/text_button';

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: '0.4rem',
    paddingLeft: '0.8rem',
    paddingRight: '0.8rem',
    paddingTop: '0.4rem',
  },
  tabs: { flex: 1, flexDirection: 'row', gap: '0.4rem' },
  tab: { borderRadius: '0.6rem', height: '2.6rem' },
  actions: { flexDirection: 'row', gap: '0.4rem' },
  addRemoveBtn: { height: '2.6rem', borderRadius: '0.6rem' },
});

interface Props {
  count: number;
  activeIndex: number;
  onSelect: (i: number) => void;
  onAdd: () => void;
  onRemove: () => void;
}

export default function GamepadTabs({
  count,
  activeIndex,
  onSelect,
  onAdd,
  onRemove,
}: Props) {
  return (
    <View style={styles.container}>
      {count > 1 && (
        <View style={styles.tabs}>
          {Array.from({ length: count }, (_, i) => (
            <TextButton
              key={i}
              style={styles.tab}
              text={`Gamepad ${String(i + 1)}`}
              type={activeIndex === i ? 'blue' : 'ghost'}
              onPress={() => {
                onSelect(i);
              }}
            />
          ))}
        </View>
      )}
      <View style={styles.actions}>
        <TextButton
          style={styles.addRemoveBtn}
          text='+ Add'
          type='green'
          disabled={count >= 4}
          onPress={onAdd}
        />
        <TextButton
          style={styles.addRemoveBtn}
          text='Remove'
          type='danger'
          disabled={count <= 1}
          onPress={onRemove}
        />
      </View>
    </View>
  );
}

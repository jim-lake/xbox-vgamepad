import { StyleSheet, View } from '@/components/base_components';
import TextButton from '@/components/buttons/text_button';
import IconButton from '@/components/buttons/icon_button';
import plusIcon from '@/assets/img/plus.svg';
import closeIcon from '@/assets/img/close.svg';

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: '0.4rem',
    paddingLeft: '0.8rem',
    paddingRight: '0.8rem',
    paddingTop: '0.4rem',
    flexWrap: 'wrap',
  },
  tab: { borderRadius: '0.6rem', height: '2.6rem' },
  removeBtn: { margin: '0 0.2rem 0 0.2rem' },
});

interface Props {
  count: number;
  activeIndex: number;
  onSelect: (i: number) => void;
  onAdd: () => void;
  onRemove: (i: number) => void;
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
      {Array.from({ length: count }, (_, i) => (
        <TextButton
          key={i}
          style={styles.tab}
          text={`Gamepad ${String(i + 1)}`}
          type={activeIndex === i ? 'blue' : 'ghost'}
          onPress={() => {
            onSelect(i);
          }}
          {...(count > 1
            ? {
                afterText: (
                  <IconButton
                    style={styles.removeBtn}
                    source={closeIcon}
                    type='danger'
                    onPress={() => {
                      // eslint-disable-next-line no-alert
                      if (window.confirm('Remove this gamepad?')) {
                        onRemove(i);
                      }
                    }}
                  />
                ),
              }
            : {})}
        />
      ))}
      {count < 4 && (
        <IconButton source={plusIcon} type='green' onPress={onAdd} />
      )}
    </View>
  );
}

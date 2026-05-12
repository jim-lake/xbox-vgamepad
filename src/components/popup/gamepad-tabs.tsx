import {
  StyleSheet,
  Text,
  TouchableWithoutFeedback,
  View,
} from '@/components/base_components';
import IconButton from '@/components/buttons/icon_button';
import plusIcon from '@/assets/img/plus.svg';

import '@/css/colors.css';

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'stretch',
    borderBottomWidth: 1,
    borderBottomColor: 'var(--surface-border)',
    marginTop: '1rem',
    paddingLeft: '0.8rem',
    paddingRight: '0.8rem',
  },
  slot: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  tab: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: '1.2rem',
    paddingRight: '1.2rem',
    paddingTop: '0.8rem',
    paddingBottom: '0.8rem',
    alignSelf: 'stretch',
    borderWidth: 1,
    borderColor: 'transparent',
    borderBottomWidth: 0,
    borderTopLeftRadius: '0.6rem',
    borderTopRightRadius: '0.6rem',
  },
  tabActive: {
    backgroundColor: 'var(--surface-bg)',
    borderColor: 'var(--surface-border)',
  },
  tabText: {
    fontSize: '1.3rem',
    fontWeight: '500',
    color: 'var(--text-muted)',
  },
  tabTextActive: { color: 'var(--text-primary)' },
});

interface Props {
  slots: (0 | 1 | 2 | 3)[];
  activeIndex: number;
  onSelect: (i: number) => void;
  onAdd: () => void;
}

export default function GamepadTabs({
  slots,
  activeIndex,
  onSelect,
  onAdd,
}: Props) {
  return (
    <View style={styles.container}>
      {Array.from({ length: 4 }, (_, i) => {
        if (i < slots.length) {
          const active = i === activeIndex;
          return (
            <View key={i} style={styles.slot}>
              <TouchableWithoutFeedback
                style={active ? [styles.tab, styles.tabActive] : styles.tab}
                onPress={() => {
                  onSelect(i);
                }}
              >
                <Text
                  style={
                    active
                      ? [styles.tabText, styles.tabTextActive]
                      : styles.tabText
                  }
                >
                  {`GAMEPAD ${String((slots[i] ?? 0) + 1)}`}
                </Text>
              </TouchableWithoutFeedback>
            </View>
          );
        }
        if (i === slots.length) {
          return (
            <View key={i} style={styles.slot}>
              <IconButton source={plusIcon} type='green' onPress={onAdd} />
            </View>
          );
        }
        return <View key={i} style={styles.slot} />;
      })}
    </View>
  );
}

import {
  Image,
  StyleSheet,
  Text,
  TouchableWithoutFeedback,
  View,
} from '@/components/base_components';
import IconButton from '@/components/buttons/icon_button';
import plusIcon from '@/assets/img/plus.svg';
import gearIcon from '@/assets/img/gear.svg';
import type { PopupConfig } from '@/types/popup';

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
    paddingLeft: '0.6rem',
    paddingRight: '0.6rem',
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
    whiteSpace: 'nowrap',
  },
  tabTextActive: { color: 'var(--text-primary)' },
  gearSlot: { justifyContent: 'center', alignItems: 'center' },
  gearIcon: {
    width: '1.6rem',
    height: '1.6rem',
    opacity: 0.6,
    filter: 'var(--icon-filter)',
  },
  gearIconActive: {
    width: '1.6rem',
    height: '1.6rem',
    opacity: 1,
    filter: 'var(--icon-filter)',
  },
});

interface Props {
  slots: PopupConfig['slots'];
  activeIndex: 0 | 1 | 2 | 3 | 'settings';
  gamepadConnected: [boolean, boolean, boolean, boolean];
  onSelect: (i: 0 | 1 | 2 | 3) => void;
  onSelectSettings: () => void;
  onAdd: () => void;
}

export default function GamepadTabs({
  slots,
  activeIndex,
  gamepadConnected,
  onSelect,
  onSelectSettings,
  onAdd,
}: Props) {
  const activeCount = slots.filter((s) => s.active).length;
  const settingsActive = activeIndex === 'settings';
  return (
    <View style={styles.container}>
      {slots.map((slot, i) => {
        const idx = i as 0 | 1 | 2 | 3;
        if (slot.active) {
          const active = idx === activeIndex;
          const icon = gamepadConnected[slot.gamepadIndex] ? '🔗' : '🚫';
          return (
            <View key={i} style={styles.slot}>
              <TouchableWithoutFeedback
                style={active ? [styles.tab, styles.tabActive] : styles.tab}
                onPress={() => {
                  onSelect(idx);
                }}
              >
                <Text
                  style={
                    active
                      ? [styles.tabText, styles.tabTextActive]
                      : styles.tabText
                  }
                >
                  {`${icon} GAMEPAD ${String(idx + 1)}`}
                </Text>
              </TouchableWithoutFeedback>
            </View>
          );
        }
        if (
          activeCount < 4 &&
          slots
            .slice(0, i)
            .every((s) => s.active || slots.findIndex((x) => !x.active) === i)
        ) {
          const firstInactive = slots.findIndex((s) => !s.active);
          if (firstInactive === i) {
            return (
              <View key={i} style={styles.slot}>
                <IconButton source={plusIcon} type='green' onPress={onAdd} />
              </View>
            );
          }
        }
        return <View key={i} style={styles.slot} />;
      })}
      <View style={styles.gearSlot}>
        <TouchableWithoutFeedback
          style={settingsActive ? [styles.tab, styles.tabActive] : styles.tab}
          onPress={onSelectSettings}
        >
          <Image
            source={gearIcon}
            style={settingsActive ? styles.gearIconActive : styles.gearIcon}
          />
        </TouchableWithoutFeedback>
      </View>
    </View>
  );
}

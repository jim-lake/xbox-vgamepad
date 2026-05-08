import {
  StyleSheet,
  Text,
  View,
  TouchableWithoutFeedback,
} from '@/components/base_components';

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: '1rem',
    backgroundColor: 'var(--surface-bg)',
    borderBottomWidth: 1,
    borderBottomColor: 'var(--surface-border)',
  },
  headerLeft: { flex: 1, flexDirection: 'column' },
  gameName: { color: 'var(--text-muted)', fontSize: '1.4rem' },
  toggle: {
    width: '4rem',
    height: '2.2rem',
    borderRadius: '1.1rem',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  toggleOn: { backgroundColor: 'var(--toggle-on-bg)', alignItems: 'flex-end' },
  toggleOff: {
    backgroundColor: 'var(--toggle-off-bg)',
    alignItems: 'flex-start',
  },
  toggleKnob: {
    width: '1.8rem',
    height: '1.8rem',
    borderRadius: '0.9rem',
    backgroundColor: 'var(--toggle-knob)',
    marginLeft: '0.2rem',
    marginRight: '0.2rem',
  },
});

interface Props {
  gameName: string | null;
  isEnabled: boolean;
  onToggle: () => void;
}

export default function AppHeader({ gameName, isEnabled, onToggle }: Props) {
  return (
    <View style={styles.header}>
      <View style={styles.headerLeft}>
        <Text style={styles.gameName}>{gameName ?? 'No game detected'}</Text>
      </View>
      <TouchableWithoutFeedback onPress={onToggle}>
        <View
          style={[
            styles.toggle,
            isEnabled ? styles.toggleOn : styles.toggleOff,
          ]}
        >
          <View style={styles.toggleKnob} />
        </View>
      </TouchableWithoutFeedback>
    </View>
  );
}

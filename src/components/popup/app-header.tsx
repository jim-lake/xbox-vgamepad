import { StyleSheet, Text, View } from '@/components/base_components';
import Switch from '@/components/switch';

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
      <Switch value={isEnabled} onValueChange={onToggle} />
    </View>
  );
}

import { StyleSheet, Text, View } from '@/components/base_components';
import Switch from '@/components/switch';
import type { GlobalSettings } from '@/types/gamepad';

import '@/css/colors.css';

const styles = StyleSheet.create({
  container: { flexDirection: 'column', padding: '0.8rem' },
  title: {
    color: 'var(--text-muted)',
    fontSize: '1.4rem',
    fontWeight: '600',
    marginBottom: '0.8rem',
    textTransform: 'uppercase',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: '1.2rem',
    paddingBottom: '1.2rem',
    borderBottomWidth: 1,
    borderBottomColor: 'var(--row-border)',
  },
  label: { color: 'var(--text-primary)', fontSize: '1.4rem' },
});

interface Props {
  settings: GlobalSettings;
  onChange: (settings: GlobalSettings) => void;
}

export default function GlobalSettingsPanel({ settings, onChange }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Global Settings</Text>
      <View style={styles.row}>
        <Text style={styles.label}>Patch Remote Multigamepad</Text>
        <Switch
          value={settings.patchRemoteMultigamepad}
          onValueChange={(v) => {
            onChange({ ...settings, patchRemoteMultigamepad: v });
          }}
        />
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Enable Logging</Text>
        <Switch
          value={settings.enableLogging}
          onValueChange={(v) => {
            onChange({ ...settings, enableLogging: v });
          }}
        />
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Disable Background Window Blur</Text>
        <Switch
          value={settings.disableBlur}
          onValueChange={(v) => {
            onChange({ ...settings, disableBlur: v });
          }}
        />
      </View>
    </View>
  );
}

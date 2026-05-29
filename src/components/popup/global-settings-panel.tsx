import { StyleSheet, Text, View } from '@/components/base_components';
import TextButton from '@/components/buttons/text_button';
import Switch from '@/components/switch';
import type { GlobalSettings } from '@/types/gamepad';
import type { PopupConfig } from '@/types/popup';
import { exportAllConfigs, importAllConfigs } from '@/popup/config';

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
  buttonRow: {
    flexDirection: 'row',
    gap: '0.8rem',
    paddingTop: '1.2rem',
  },
});

interface Props {
  settings: GlobalSettings;
  configs: Record<string, PopupConfig>;
  activeConfigName: string;
  isEnabled: boolean;
  onChange: (settings: GlobalSettings) => void;
  onRestore: (configs: Record<string, PopupConfig>, settings: GlobalSettings) => void;
}

export default function GlobalSettingsPanel({
  settings,
  configs,
  activeConfigName,
  isEnabled,
  onChange,
  onRestore,
}: Props) {
  function handleBackupAll() {
    void exportAllConfigs(configs, settings, activeConfigName, isEnabled).then(
      (json) => {
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'xbox-vgamepad-backup.json';
        a.click();
        URL.revokeObjectURL(url);
      }
    );
  }

  function handleRestoreAll() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) {
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const parsed: unknown = JSON.parse(reader.result as string);
          void importAllConfigs(parsed).then((result) => {
            if (result) {
              onRestore(result.configs, result.globalSettings);
            }
          });
        } catch {
          // invalid JSON, ignore
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }

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
      <View style={styles.buttonRow}>
        <TextButton text="Backup All" onPress={handleBackupAll} />
        <TextButton text="Restore All" onPress={handleRestoreAll} />
      </View>
    </View>
  );
}

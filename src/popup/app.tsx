import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableWithoutFeedback,
} from '@/components/base_components';
import TextButton from '@/components/buttons/text_button';
import type { GamepadConfig, GamepadKeyConfig, KeyMap } from '@/types/gamepad';
import { DEFAULT_CONFIG } from '@/types/gamepad';
import {
  loadStorage,
  saveConfig,
  deleteConfig,
  setActiveConfig,
  setEnabled,
  getGameName,
} from './storage';
import {
  sendActivateConfig,
  sendDisableGamepad,
  sendConfigChanged,
} from './messaging';
import { validateConfig } from './validate';
import KeyBindingEditor from './key-binding-editor';
import MouseSettings from './mouse-settings';

const MAX_PRESETS = 25;

const styles = StyleSheet.create({
  app: { width: 380, flexDirection: 'column', backgroundColor: '#1a1a2e' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: '1rem',
    backgroundColor: '#16213e',
    borderBottomWidth: 1,
    borderBottomColor: '#0f3460',
  },
  headerLeft: { flex: 1, flexDirection: 'column' },
  gameName: { color: '#94a3b8', fontSize: '1.1rem' },
  presetName: { color: '#e2e8f0', fontSize: '1.4rem', fontWeight: '600' },
  toggle: {
    width: '4rem',
    height: '2.2rem',
    borderRadius: '1.1rem',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  toggleOn: { backgroundColor: '#107c10', alignItems: 'flex-end' },
  toggleOff: { backgroundColor: '#555', alignItems: 'flex-start' },
  toggleKnob: {
    width: '1.8rem',
    height: '1.8rem',
    borderRadius: '0.9rem',
    backgroundColor: '#fff',
    marginLeft: '0.2rem',
    marginRight: '0.2rem',
  },
  presetNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0.6rem',
    backgroundColor: '#16213e',
  },
  navArrow: {
    color: '#e2e8f0',
    fontSize: '1.6rem',
    cursor: 'pointer',
    paddingLeft: '1rem',
    paddingRight: '1rem',
  },
  navArrowDisabled: { opacity: 0.3, cursor: 'default' },
  navLabel: {
    color: '#e2e8f0',
    fontSize: '1.3rem',
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  renameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: '0.4rem',
  },
  toolbar: {
    flexDirection: 'row',
    padding: '0.5rem',
    gap: '0.5rem',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  toolBtn: {
    paddingLeft: '0.8rem',
    paddingRight: '0.8rem',
    paddingTop: '0.4rem',
    paddingBottom: '0.4rem',
    backgroundColor: '#0f3460',
    borderRadius: '0.4rem',
    cursor: 'pointer',
  },
  toolBtnDanger: { backgroundColor: '#d13438' },
  body: { maxHeight: 400, flexDirection: 'column' },
  section: { padding: '0.8rem', flexDirection: 'column' },
  sectionTitle: {
    color: '#94a3b8',
    fontSize: '1.1rem',
    fontWeight: '600',
    marginBottom: '0.4rem',
    textTransform: 'uppercase',
  },
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: '0.5rem 0.8rem',
    backgroundColor: '#16213e',
    borderTopWidth: 1,
    borderTopColor: '#0f3460',
  },
  undoBtn: {
    paddingLeft: '0.6rem',
    paddingRight: '0.6rem',
    paddingTop: '0.3rem',
    paddingBottom: '0.3rem',
    backgroundColor: '#0f3460',
    borderRadius: '0.3rem',
    cursor: 'pointer',
  },
  undoBtnDisabled: { opacity: 0.4, cursor: 'default' },
  statusText: {
    flex: 1,
    textAlign: 'right',
    color: '#94a3b8',
    fontSize: '1rem',
  },
});

export default function App() {
  const [loading, setLoading] = React.useState(true);
  const [isEnabled, setIsEnabled] = React.useState(true);
  const [activeConfigName, setActiveConfigName] = React.useState('default');
  const [configs, setConfigs] = React.useState<Record<string, GamepadConfig>>({
    default: DEFAULT_CONFIG,
  });
  const [gameName, setGameName] = React.useState<string | null>(null);
  const [renaming, setRenaming] = React.useState(false);
  const [renameValue, setRenameValue] = React.useState('');
  const [dirty, setDirty] = React.useState(false);
  const [savedConfig, setSavedConfig] =
    React.useState<GamepadConfig>(DEFAULT_CONFIG);

  React.useEffect(() => {
    void (async () => {
      const [data, name] = await Promise.all([loadStorage(), getGameName()]);
      setIsEnabled(data.isEnabled);
      setActiveConfigName(data.activeConfig);
      setConfigs(data.configs);
      setSavedConfig(
        structuredClone(data.configs[data.activeConfig] ?? DEFAULT_CONFIG)
      );
      setGameName(name);
      setLoading(false);
    })();
  }, []);

  const presetNames = React.useMemo(
    () => Object.keys(configs).sort(),
    [configs]
  );
  const activeIndex = presetNames.indexOf(activeConfigName);
  const activeConfig = configs[activeConfigName] ?? DEFAULT_CONFIG;

  const handleToggle = React.useCallback(async () => {
    const next = !isEnabled;
    setIsEnabled(next);
    await setEnabled(next);
    if (next) {
      const config = configs[activeConfigName] ?? DEFAULT_CONFIG;
      await sendActivateConfig(activeConfigName, config);
    } else {
      await sendDisableGamepad();
    }
  }, [isEnabled, activeConfigName, configs]);

  const cyclePreset = React.useCallback(
    async (dir: -1 | 1) => {
      const idx = (activeIndex + dir + presetNames.length) % presetNames.length;
      const name = presetNames[idx] ?? 'default';
      setActiveConfigName(name);
      setSavedConfig(structuredClone(configs[name] ?? DEFAULT_CONFIG));
      setDirty(false);
      setRenaming(false);
      await setActiveConfig(name);
      if (isEnabled) {
        const config = configs[name] ?? DEFAULT_CONFIG;
        await sendActivateConfig(name, config);
      }
    },
    [activeIndex, presetNames, isEnabled, configs]
  );

  const handleNew = React.useCallback(async () => {
    if (presetNames.length >= MAX_PRESETS) {
      return;
    }
    let name = 'New Profile';
    let i = 1;
    while (presetNames.includes(name)) {
      i++;
      name = `New Profile ${String(i)}`;
    }
    const config = structuredClone(DEFAULT_CONFIG);
    const newConfigs = { ...configs, [name]: config };
    setConfigs(newConfigs);
    setActiveConfigName(name);
    setSavedConfig(structuredClone(config));
    setDirty(false);
    await saveConfig(name, config);
    await setActiveConfig(name);
    if (isEnabled) {
      await sendActivateConfig(name, config);
    }
  }, [configs, presetNames, isEnabled]);

  const handleCopy = React.useCallback(async () => {
    if (presetNames.length >= MAX_PRESETS) {
      return;
    }
    let name = `${activeConfigName} Copy`;
    let i = 1;
    while (presetNames.includes(name)) {
      i++;
      name = `${activeConfigName} Copy ${String(i)}`;
    }
    const config = structuredClone(activeConfig);
    const newConfigs = { ...configs, [name]: config };
    setConfigs(newConfigs);
    setActiveConfigName(name);
    setSavedConfig(structuredClone(config));
    setDirty(false);
    await saveConfig(name, config);
    await setActiveConfig(name);
    if (isEnabled) {
      await sendActivateConfig(name, config);
    }
  }, [configs, presetNames, activeConfigName, activeConfig, isEnabled]);

  const handleEditName = React.useCallback(() => {
    setRenameValue(activeConfigName);
    setRenaming(true);
  }, [activeConfigName]);

  const handleSaveRename = React.useCallback(async () => {
    const trimmed = renameValue.trim();
    if (
      !trimmed ||
      trimmed === activeConfigName ||
      presetNames.includes(trimmed)
    ) {
      setRenaming(false);
      return;
    }
    const config = configs[activeConfigName] ?? DEFAULT_CONFIG;
    const newConfigs = Object.fromEntries(
      Object.entries(configs).filter(([k]) => k !== activeConfigName)
    );
    newConfigs[trimmed] = config;
    setConfigs(newConfigs);
    setActiveConfigName(trimmed);
    await deleteConfig(activeConfigName);
    await saveConfig(trimmed, config);
    await setActiveConfig(trimmed);
    setRenaming(false);
  }, [renameValue, activeConfigName, configs, presetNames]);

  const persist = React.useCallback(
    async (config: GamepadConfig) => {
      if (!validateConfig(config)) {
        return;
      }
      await saveConfig(activeConfigName, config);
      if (isEnabled) {
        await sendConfigChanged(activeConfigName, config);
      }
    },
    [activeConfigName, isEnabled]
  );

  const handleUndo = React.useCallback(() => {
    if (!dirty) {
      return;
    }
    const reverted = structuredClone(savedConfig);
    setConfigs((prev) => ({ ...prev, [activeConfigName]: reverted }));
    setDirty(false);
    void persist(reverted);
  }, [dirty, savedConfig, activeConfigName, persist]);

  const handleImport = React.useCallback(() => {
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
          if (validateConfig(parsed)) {
            if (presetNames.length >= MAX_PRESETS) {
              return;
            }
            const baseName = file.name.replace(/\.json$/i, '') || 'Imported';
            let name = baseName;
            let i = 1;
            while (presetNames.includes(name)) {
              i++;
              name = `${baseName} ${String(i)}`;
            }
            const config = structuredClone(parsed);
            const newConfigs = { ...configs, [name]: config };
            setConfigs(newConfigs);
            setActiveConfigName(name);
            setSavedConfig(structuredClone(config));
            setDirty(false);
            void saveConfig(name, config).then(() => setActiveConfig(name));
          }
        } catch {
          // invalid JSON, ignore
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }, [configs, presetNames]);

  const handleExport = React.useCallback(() => {
    const blob = new Blob([JSON.stringify(activeConfig, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeConfigName}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [activeConfig, activeConfigName]);

  const updateKeyConfig = React.useCallback(
    (key: keyof GamepadKeyConfig, value: KeyMap) => {
      setConfigs((prev) => {
        const current = prev[activeConfigName] ?? DEFAULT_CONFIG;
        const next = {
          ...current,
          keyConfig: { ...current.keyConfig, [key]: value },
        };
        void persist(next);
        return { ...prev, [activeConfigName]: next };
      });
      setDirty(true);
    },
    [activeConfigName, persist]
  );

  const updateMouseControls = React.useCallback(
    (val: 0 | 1 | undefined) => {
      setConfigs((prev) => {
        const current = prev[activeConfigName] ?? DEFAULT_CONFIG;
        const next = {
          ...current,
          mouseConfig: { ...current.mouseConfig, mouseControls: val ?? null },
        };
        void persist(next);
        return { ...prev, [activeConfigName]: next };
      });
      setDirty(true);
    },
    [activeConfigName, persist]
  );

  const updateSensitivity = React.useCallback(
    (val: number) => {
      setConfigs((prev) => {
        const current = prev[activeConfigName] ?? DEFAULT_CONFIG;
        const next = {
          ...current,
          mouseConfig: { ...current.mouseConfig, sensitivity: val },
        };
        void persist(next);
        return { ...prev, [activeConfigName]: next };
      });
      setDirty(true);
    },
    [activeConfigName, persist]
  );

  if (loading) {
    return (
      <View style={styles.app}>
        <Text style={styles.presetName}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.app}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.gameName}>{gameName ?? 'No game detected'}</Text>
        </View>
        <TouchableWithoutFeedback onPress={() => void handleToggle()}>
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

      {/* Profile navigation */}
      <View style={styles.presetNav}>
        <TextButton
          style={[
            styles.navArrow,
            renaming ? styles.navArrowDisabled : undefined,
          ]}
          text='◀'
          disabled={renaming}
          onPress={() => void cyclePreset(-1)}
        />
        {renaming ? (
          <View style={styles.renameRow}>
            <input
              style={{
                flex: 1,
                backgroundColor: '#0f3460',
                color: '#e2e8f0',
                fontSize: '1.3rem',
                padding: '0.3rem 0.6rem',
                borderRadius: '0.4rem',
                border: 'none',
              }}
              value={renameValue}
              onChange={(e) => {
                setRenameValue(e.target.value);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  void handleSaveRename();
                }
              }}
              autoFocus
            />
            <TextButton
              style={styles.toolBtn}
              text='Save'
              onPress={() => void handleSaveRename()}
            />
          </View>
        ) : (
          <Text style={styles.navLabel}>{activeConfigName}</Text>
        )}
        <TextButton
          style={[
            styles.navArrow,
            renaming ? styles.navArrowDisabled : undefined,
          ]}
          text='▶'
          disabled={renaming}
          onPress={() => void cyclePreset(1)}
        />
      </View>

      {/* Toolbar */}
      <View style={styles.toolbar}>
        <TextButton
          style={styles.toolBtn}
          text='New'
          onPress={() => void handleNew()}
        />
        <TextButton
          style={styles.toolBtn}
          text='Copy'
          onPress={() => void handleCopy()}
        />
        <TextButton
          style={styles.toolBtn}
          text='Import'
          onPress={handleImport}
        />
        <TextButton
          style={styles.toolBtn}
          text='Export'
          onPress={handleExport}
        />
        <TextButton
          style={styles.toolBtn}
          text='Rename'
          onPress={handleEditName}
        />
      </View>

      {/* Config editor - always visible */}
      <ScrollView style={styles.body}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Mouse</Text>
          <MouseSettings
            mouseControls={
              activeConfig.mouseConfig.mouseControls === null
                ? undefined
                : activeConfig.mouseConfig.mouseControls
            }
            sensitivity={activeConfig.mouseConfig.sensitivity}
            onChangeStick={updateMouseControls}
            onChangeSensitivity={updateSensitivity}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Key Bindings</Text>
          <KeyBindingEditor
            keyConfig={activeConfig.keyConfig}
            onChange={updateKeyConfig}
          />
        </View>
      </ScrollView>

      {dirty && (
        <View style={styles.statusBar}>
          <TextButton
            style={styles.undoBtn}
            text='Undo'
            onPress={handleUndo}
          />
          <Text style={styles.statusText}>Saved</Text>
        </View>
      )}
    </View>
  );
}

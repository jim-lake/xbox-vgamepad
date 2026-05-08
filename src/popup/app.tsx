import React from 'react';
import { StyleSheet, Text, View } from '@/components/base_components';
import TextButton from '@/components/buttons/text_button';
import type {
  GamepadConfig,
  ActionMap,
  GamepadMouseConfig,
} from '@/types/gamepad';
import { DEFAULT_CONFIG } from '@/types/gamepad';
import {
  loadStorage,
  saveConfig,
  deleteConfig,
  setActiveConfig,
  setEnabled,
  getGameName,
  clearStorage,
} from './storage';
import {
  sendActivateConfig,
  sendDisableGamepad,
  sendConfigChanged,
} from './messaging';
import { validateConfig } from './validate';
import KeyBindingEditor from './key-binding-editor';
import MouseSettings from './mouse-settings';
import AppHeader from '@/components/popup/app-header';
import PresetNav from '@/components/popup/preset-nav';
import Toolbar from '@/components/popup/toolbar';

const MAX_PRESETS = 25;

const styles = StyleSheet.create({
  app: {
    flex: 1,
    alignSelf: 'stretch',
    flexDirection: 'column',
    backgroundColor: 'var(--app-bg)',
  },
  topBar: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: 'column',
    backgroundColor: 'var(--surface-bg)',
    paddingBottom: '1rem',
    borderBottomWidth: 1,
    borderBottomColor: 'var(--surface-border)',
  },
  topGutter: { height: '15rem' },
  presetName: {
    color: 'var(--text-primary)',
    fontSize: '1.6rem',
    fontWeight: '600',
  },
  body: { flexDirection: 'column', alignSelf: 'stretch' },
  bottomGutter: { height: '4rem' },
  section: { padding: '0.8rem', flexDirection: 'column' },
  sectionTitle: {
    color: 'var(--text-muted)',
    fontSize: '1.4rem',
    fontWeight: '600',
    marginBottom: '0.4rem',
    textTransform: 'uppercase',
  },
  statusBar: {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    padding: '0.5rem 0.8rem',
    backgroundColor: 'var(--surface-bg)',
    borderTopWidth: 1,
    borderTopColor: 'var(--surface-border)',
  },
  undoBtn: {},
  statusText: {
    flex: 1,
    textAlign: 'right',
    color: 'var(--text-muted)',
    fontSize: '1.3rem',
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
        await sendConfigChanged(name, config);
      }
    },
    [activeIndex, presetNames, isEnabled, configs]
  );

  const createPreset = React.useCallback(
    async (name: string, config: GamepadConfig) => {
      if (presetNames.length >= MAX_PRESETS) {
        return;
      }
      let uniqueName = name;
      let i = 1;
      while (presetNames.includes(uniqueName)) {
        i++;
        uniqueName = `${name} ${String(i)}`;
      }
      const cloned = structuredClone(config);
      setConfigs((prev) => ({ ...prev, [uniqueName]: cloned }));
      setActiveConfigName(uniqueName);
      setSavedConfig(structuredClone(cloned));
      setDirty(false);
      await saveConfig(uniqueName, cloned);
      await setActiveConfig(uniqueName);
      if (isEnabled) {
        await sendConfigChanged(uniqueName, cloned);
      }
    },
    [presetNames, isEnabled]
  );

  const handleNew = React.useCallback(
    () => createPreset('New Profile', DEFAULT_CONFIG),
    [createPreset]
  );

  const handleCopy = React.useCallback(
    () => createPreset(activeConfigName, activeConfig),
    [createPreset, activeConfigName, activeConfig]
  );

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

  const updateKeyboardConfig = React.useCallback(
    (code: string, value: ActionMap | undefined) => {
      setConfigs((prev) => {
        const current = prev[activeConfigName] ?? DEFAULT_CONFIG;
        const nextKeyboardConfig =
          value === undefined
            ? Object.fromEntries(
                Object.entries(current.keyboardConfig).filter(
                  ([k]) => k !== code
                )
              )
            : { ...current.keyboardConfig, [code]: value };
        const next = { ...current, keyboardConfig: nextKeyboardConfig };
        void persist(next);
        return { ...prev, [activeConfigName]: next };
      });
      setDirty(true);
    },
    [activeConfigName, persist]
  );

  const updateMouseConfig = React.useCallback(
    (patch: Partial<GamepadMouseConfig>) => {
      setConfigs((prev) => {
        const current = prev[activeConfigName] ?? DEFAULT_CONFIG;
        const next = {
          ...current,
          mouseConfig: { ...current.mouseConfig, ...patch },
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
      {/* Floating top bar */}
      <View style={styles.topBar}>
        <AppHeader
          gameName={gameName}
          isEnabled={isEnabled}
          onToggle={() => void handleToggle()}
        />
        <PresetNav
          activeConfigName={activeConfigName}
          renaming={renaming}
          renameValue={renameValue}
          onRenameChange={setRenameValue}
          onRenameSubmit={() => void handleSaveRename()}
          onPrev={() => void cyclePreset(-1)}
          onNext={() => void cyclePreset(1)}
        />
        {renaming ? (
          <Toolbar
            renaming={true}
            onSaveRename={() => void handleSaveRename()}
            onCancelRename={() => {
              setRenaming(false);
            }}
          />
        ) : (
          <Toolbar
            renaming={false}
            onNew={() => void handleNew()}
            onCopy={() => void handleCopy()}
            onImport={handleImport}
            onExport={handleExport}
            onRename={handleEditName}
            {...(import.meta.env.DEV
              ? {
                  onWipe: () => {
                    void clearStorage().then(() => {
                      window.close();
                    });
                  },
                }
              : {})}
          />
        )}
      </View>

      {/* Top gutter for fixed header */}
      <View style={styles.topGutter} />

      {/* Config editor */}
      <View style={styles.body}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Mouse</Text>
          <MouseSettings
            mouseControls={
              activeConfig.mouseConfig.mouseControls === null
                ? undefined
                : activeConfig.mouseConfig.mouseControls
            }
            sensitivity={activeConfig.mouseConfig.sensitivity}
            onChangeStick={(val) => {
              updateMouseConfig({ mouseControls: val ?? null });
            }}
            onChangeSensitivity={(val) => {
              updateMouseConfig({ sensitivity: val });
            }}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Key Bindings</Text>
          <KeyBindingEditor
            keyboardConfig={activeConfig.keyboardConfig}
            onChange={updateKeyboardConfig}
          />
        </View>
      </View>

      {/* Bottom gutter for fixed status bar */}
      {dirty && <View style={styles.bottomGutter} />}

      {/* Floating status bar */}
      {dirty && (
        <View style={styles.statusBar}>
          <TextButton style={styles.undoBtn} text='Undo' onPress={handleUndo} />
          <Text style={styles.statusText}>Saved</Text>
        </View>
      )}
    </View>
  );
}

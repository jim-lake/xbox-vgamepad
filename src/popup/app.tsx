import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
} from '@/components/base_components';
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
import { sendActivateConfig, sendDisableGamepad } from './messaging';
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
  navLabel: {
    color: '#e2e8f0',
    fontSize: '1.3rem',
    flex: 1,
    textAlign: 'center',
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
  toolBtnText: { color: '#e2e8f0', fontSize: '1.1rem' },
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
  undoBtnText: { color: '#e2e8f0', fontSize: '1rem' },
  statusText: {
    flex: 1,
    textAlign: 'right',
    color: '#94a3b8',
    fontSize: '1rem',
  },
});

type Mode = 'view' | 'create' | 'edit';

export default function App() {
  const [loading, setLoading] = React.useState(true);
  const [isEnabled, setIsEnabled] = React.useState(true);
  const [activeConfigName, setActiveConfigName] = React.useState('default');
  const [configs, setConfigs] = React.useState<Record<string, GamepadConfig>>({
    default: DEFAULT_CONFIG,
  });
  const [gameName, setGameName] = React.useState<string | null>(null);
  const [mode, setMode] = React.useState<Mode>('view');
  const [editConfig, setEditConfig] =
    React.useState<GamepadConfig>(DEFAULT_CONFIG);
  const [newName, setNewName] = React.useState('');
  const [dirty, setDirty] = React.useState(false);
  const [savedConfig, setSavedConfig] =
    React.useState<GamepadConfig>(DEFAULT_CONFIG);

  React.useEffect(() => {
    void (async () => {
      const [data, name] = await Promise.all([loadStorage(), getGameName()]);
      setIsEnabled(data.isEnabled);
      setActiveConfigName(data.activeConfig);
      setConfigs(data.configs);
      setGameName(name);
      setLoading(false);
    })();
  }, []);

  const presetNames = React.useMemo(
    () => Object.keys(configs).sort(),
    [configs]
  );
  const activeIndex = presetNames.indexOf(activeConfigName);

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
      await setActiveConfig(name);
      if (isEnabled) {
        const config = configs[name] ?? DEFAULT_CONFIG;
        await sendActivateConfig(name, config);
      }
    },
    [activeIndex, presetNames, isEnabled, configs]
  );

  const handleCreate = React.useCallback(() => {
    const base = structuredClone(configs[activeConfigName] ?? DEFAULT_CONFIG);
    setNewName('');
    setEditConfig(base);
    setSavedConfig(base);
    setDirty(false);
    setMode('create');
  }, [configs, activeConfigName]);

  const handleEdit = React.useCallback(() => {
    const base = structuredClone(configs[activeConfigName] ?? DEFAULT_CONFIG);
    setEditConfig(base);
    setSavedConfig(base);
    setDirty(false);
    setMode('edit');
  }, [configs, activeConfigName]);

  const handleDelete = React.useCallback(async () => {
    if (activeConfigName === 'default') {
      return;
    }
    const newConfigs = Object.fromEntries(
      Object.entries(configs).filter(([k]) => k !== activeConfigName)
    );
    setConfigs(newConfigs);
    setActiveConfigName('default');
    await deleteConfig(activeConfigName);
    await setActiveConfig('default');
    if (isEnabled) {
      await sendActivateConfig('default', DEFAULT_CONFIG);
    }
  }, [activeConfigName, configs, isEnabled]);

  const persist = React.useCallback(
    async (config: GamepadConfig) => {
      const name = mode === 'create' ? newName.trim() : activeConfigName;
      if (!name || !validateConfig(config)) {
        return;
      }
      if (mode === 'create' && presetNames.length >= MAX_PRESETS) {
        return;
      }
      await saveConfig(name, config);
      if (mode === 'create') {
        setActiveConfigName(name);
        await setActiveConfig(name);
      }
      if (isEnabled) {
        await sendActivateConfig(name, config);
      }
    },
    [mode, newName, activeConfigName, presetNames, isEnabled]
  );

  const handleUndo = React.useCallback(() => {
    if (!dirty) {
      return;
    }
    const reverted = structuredClone(savedConfig);
    setEditConfig(reverted);
    setDirty(false);
    void persist(reverted);
  }, [dirty, savedConfig, persist]);

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
            const base = structuredClone(parsed);
            setEditConfig(parsed);
            setSavedConfig(base);
            setNewName('');
            setDirty(false);
            setMode('create');
          }
        } catch {
          // invalid JSON, ignore
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }, []);

  const handleExport = React.useCallback(() => {
    const config = configs[activeConfigName] ?? DEFAULT_CONFIG;
    const blob = new Blob([JSON.stringify(config, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeConfigName}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [configs, activeConfigName]);

  const updateKeyConfig = React.useCallback(
    (key: keyof GamepadKeyConfig, value: KeyMap) => {
      setEditConfig((prev) => {
        const next = {
          ...prev,
          keyConfig: { ...prev.keyConfig, [key]: value },
        };
        void persist(next);
        return next;
      });
      setDirty(true);
    },
    [persist]
  );

  const updateMouseControls = React.useCallback(
    (val: 0 | 1 | undefined) => {
      setEditConfig((prev) => {
        const next = {
          ...prev,
          mouseConfig: { ...prev.mouseConfig, mouseControls: val ?? null },
        };
        void persist(next);
        return next;
      });
      setDirty(true);
    },
    [persist]
  );

  const updateSensitivity = React.useCallback(
    (val: number) => {
      setEditConfig((prev) => {
        const next = {
          ...prev,
          mouseConfig: { ...prev.mouseConfig, sensitivity: val },
        };
        void persist(next);
        return next;
      });
      setDirty(true);
    },
    [persist]
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
          <Text style={styles.presetName}>{activeConfigName}</Text>
        </View>
        <View
          style={[
            styles.toggle,
            isEnabled ? styles.toggleOn : styles.toggleOff,
          ]}
          onClick={() => void handleToggle()}
        >
          <View style={styles.toggleKnob} />
        </View>
      </View>

      {mode === 'view' ? (
        <>
          {/* Preset navigation */}
          <View style={styles.presetNav}>
            <Text style={styles.navArrow} onClick={() => void cyclePreset(-1)}>
              ◀
            </Text>
            <Text style={styles.navLabel}>
              {activeConfigName} ({activeIndex + 1}/{presetNames.length})
            </Text>
            <Text style={styles.navArrow} onClick={() => void cyclePreset(1)}>
              ▶
            </Text>
          </View>

          {/* Toolbar */}
          <View style={styles.toolbar}>
            <View style={styles.toolBtn} onClick={handleCreate}>
              <Text style={styles.toolBtnText}>New</Text>
            </View>
            <View style={styles.toolBtn} onClick={handleEdit}>
              <Text style={styles.toolBtnText}>Edit</Text>
            </View>
            {activeConfigName !== 'default' && (
              <View
                style={[styles.toolBtn, styles.toolBtnDanger]}
                onClick={() => void handleDelete()}
              >
                <Text style={styles.toolBtnText}>Delete</Text>
              </View>
            )}
            <View style={styles.toolBtn} onClick={handleImport}>
              <Text style={styles.toolBtnText}>Import</Text>
            </View>
            <View style={styles.toolBtn} onClick={handleExport}>
              <Text style={styles.toolBtnText}>Export</Text>
            </View>
          </View>
        </>
      ) : (
        <>
          <ScrollView style={styles.body}>
            {mode === 'create' && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Preset Name</Text>
                <input
                  style={{
                    backgroundColor: '#0f3460',
                    color: '#e2e8f0',
                    fontSize: '1.3rem',
                    padding: '0.6rem',
                    borderRadius: '0.4rem',
                    border: 'none',
                  }}
                  value={newName}
                  onChange={(e) => {
                    setNewName(e.target.value);
                  }}
                  placeholder='Enter preset name'
                />
              </View>
            )}

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Mouse</Text>
              <MouseSettings
                mouseControls={
                  editConfig.mouseConfig.mouseControls === null
                    ? undefined
                    : editConfig.mouseConfig.mouseControls
                }
                sensitivity={editConfig.mouseConfig.sensitivity}
                onChangeStick={updateMouseControls}
                onChangeSensitivity={updateSensitivity}
              />
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Key Bindings</Text>
              <KeyBindingEditor
                keyConfig={editConfig.keyConfig}
                onChange={updateKeyConfig}
              />
            </View>
          </ScrollView>

          {dirty && (
            <View style={styles.statusBar}>
              <View style={styles.undoBtn} onClick={handleUndo}>
                <Text style={styles.undoBtnText}>Undo</Text>
              </View>
              <Text style={styles.statusText}>Saved</Text>
            </View>
          )}
        </>
      )}
    </View>
  );
}

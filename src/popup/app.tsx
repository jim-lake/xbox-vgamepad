import React from 'react';
import { StyleSheet, Text, View } from '@/components/base_components';
import TextButton from '@/components/buttons/text_button';
import type { GamepadConfig, ActionMap } from '@/types/gamepad';
import { DEFAULT_CONFIG, DEFAULT_SENSITIVITY } from '@/types/gamepad';
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
import AppHeader from '@/components/popup/app-header';
import PresetNav from '@/components/popup/preset-nav';
import Toolbar from '@/components/popup/toolbar';
import GamepadTabs from './gamepad-tabs';
import GamepadConfigSection from './gamepad-config-section';
import KeyBindingEditor from './key-binding-editor';

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
    fontSize: '1.4rem',
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
  const [activeSlots, setActiveSlots] = React.useState<(0 | 1 | 2 | 3)[]>([0]);
  const [activeSlotTab, setActiveSlotTab] = React.useState(0);

  React.useEffect(() => {
    void (async () => {
      const [data, name] = await Promise.all([loadStorage(), getGameName()]);
      setIsEnabled(data.isEnabled);
      setActiveConfigName(data.activeConfig);
      setConfigs(data.configs);
      const cfg = data.configs[data.activeConfig] ?? DEFAULT_CONFIG;
      setSavedConfig(structuredClone(cfg));
      setGameName(name);
      // Derive which gamepad slots are in use from the config
      const usedSet = new Set<0 | 1 | 2 | 3>();
      for (const entries of Object.values(cfg.keyboardConfig)) {
        for (const e of entries) {
          if (e.type === 'action') {
            usedSet.add(e.gamepadIndex);
          }
        }
      }
      for (const m of cfg.mouseConfig.mouseControls) {
        usedSet.add(m.gamepadIndex);
      }
      const slots = ([0, 1, 2, 3] as const).filter((i) => usedSet.has(i));
      setActiveSlots(slots.length > 0 ? slots : [0]);
      setActiveSlotTab(0);
      setLoading(false);
    })();
  }, []);

  const presetNames = React.useMemo(
    () => Object.keys(configs).sort(),
    [configs]
  );
  const activeIndex = presetNames.indexOf(activeConfigName);
  const activeConfig = configs[activeConfigName] ?? DEFAULT_CONFIG;
  const activeSlotIndex = activeSlots[activeSlotTab] ?? 0;

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
      const cfg = configs[name] ?? DEFAULT_CONFIG;
      setActiveConfigName(name);
      setSavedConfig(structuredClone(cfg));
      setDirty(false);
      setRenaming(false);
      const usedSet = new Set<0 | 1 | 2 | 3>();
      for (const entries of Object.values(cfg.keyboardConfig)) {
        for (const e of entries) {
          if (e.type === 'action') {
            usedSet.add(e.gamepadIndex);
          }
        }
      }
      for (const m of cfg.mouseConfig.mouseControls) {
        usedSet.add(m.gamepadIndex);
      }
      const slots = ([0, 1, 2, 3] as const).filter((i) => usedSet.has(i));
      setActiveSlots(slots.length > 0 ? slots : [0]);
      setActiveSlotTab(0);
      await setActiveConfig(name);
      if (isEnabled) {
        await sendConfigChanged(name, cfg);
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

  const makeUpdateKeyboardConfig = React.useCallback(
    (slotIndex: 0 | 1 | 2 | 3) =>
      (code: string, value: ActionMap | undefined) => {
        setConfigs((prev) => {
          const current = prev[activeConfigName] ?? DEFAULT_CONFIG;
          const existing = current.keyboardConfig[code] ?? [];
          const otherSlots = existing.filter(
            (e) => !(e.type === 'action' && e.gamepadIndex === slotIndex)
          );
          const merged =
            value === undefined ? otherSlots : [...otherSlots, ...value];
          const nextKeyboardConfig =
            merged.length === 0
              ? Object.fromEntries(
                  Object.entries(current.keyboardConfig).filter(
                    ([k]) => k !== code
                  )
                )
              : { ...current.keyboardConfig, [code]: merged };
          const next = { ...current, keyboardConfig: nextKeyboardConfig };
          void persist(next);
          return { ...prev, [activeConfigName]: next };
        });
        setDirty(true);
      },
    [activeConfigName, persist]
  );

  const makeUpdateMouseStick = React.useCallback(
    (slotIndex: 0 | 1 | 2 | 3) => (val: 'left' | 'right' | undefined) => {
      setConfigs((prev) => {
        const current = prev[activeConfigName] ?? DEFAULT_CONFIG;
        const others = current.mouseConfig.mouseControls.filter(
          (m) => m.gamepadIndex !== slotIndex
        );
        const mouseControls = val
          ? [
              ...others,
              {
                stick: val,
                gamepadIndex: slotIndex,
                sensitivity:
                  current.mouseConfig.mouseControls.find(
                    (m) => m.gamepadIndex === slotIndex
                  )?.sensitivity ?? DEFAULT_SENSITIVITY,
              },
            ]
          : others;
        const next = {
          ...current,
          mouseConfig: { ...current.mouseConfig, mouseControls },
        };
        void persist(next);
        return { ...prev, [activeConfigName]: next };
      });
      setDirty(true);
    },
    [activeConfigName, persist]
  );

  const makeUpdateMouseSensitivity = React.useCallback(
    (slotIndex: 0 | 1 | 2 | 3) => (val: number) => {
      setConfigs((prev) => {
        const current = prev[activeConfigName] ?? DEFAULT_CONFIG;
        const mouseControls = current.mouseConfig.mouseControls.map((m) =>
          m.gamepadIndex === slotIndex ? { ...m, sensitivity: val } : m
        );
        const next = {
          ...current,
          mouseConfig: { ...current.mouseConfig, mouseControls },
        };
        void persist(next);
        return { ...prev, [activeConfigName]: next };
      });
      setDirty(true);
    },
    [activeConfigName, persist]
  );

  const handleChangeSlotIndex = React.useCallback(
    (oldIndex: 0 | 1 | 2 | 3, newIndex: 0 | 1 | 2 | 3) => {
      setActiveSlots((prev) =>
        prev.map((i) => (i === oldIndex ? newIndex : i))
      );
      setConfigs((prev) => {
        const current = prev[activeConfigName] ?? DEFAULT_CONFIG;
        const mouseControls = current.mouseConfig.mouseControls.map((m) =>
          m.gamepadIndex === oldIndex ? { ...m, gamepadIndex: newIndex } : m
        );
        const keyboardConfig = Object.fromEntries(
          Object.entries(current.keyboardConfig).map(([code, entries]) => [
            code,
            entries.map((e) =>
              e.type === 'action' && e.gamepadIndex === oldIndex
                ? { ...e, gamepadIndex: newIndex }
                : e
            ),
          ])
        );
        const next = {
          ...current,
          mouseConfig: { ...current.mouseConfig, mouseControls },
          keyboardConfig,
        };
        void persist(next);
        return { ...prev, [activeConfigName]: next };
      });
      setDirty(true);
    },
    [activeConfigName, persist]
  );

  const handleAddSlot = React.useCallback(() => {
    if (activeSlots.length >= 4) {
      return;
    }
    const next = ([0, 1, 2, 3] as const).find((i) => !activeSlots.includes(i));
    if (next === undefined) {
      return;
    }
    setActiveSlots((prev) => [...prev, next]);
    setActiveSlotTab(activeSlots.length);
  }, [activeSlots]);

  const handleRemoveSlot = React.useCallback(
    (tabI: number) => {
      if (activeSlots.length <= 1) {
        return;
      }
      const slotIndex = activeSlots[tabI];
      if (slotIndex === undefined) {
        return;
      }
      setConfigs((prev) => {
        const current = prev[activeConfigName] ?? DEFAULT_CONFIG;
        const mouseControls = current.mouseConfig.mouseControls.filter(
          (m) => m.gamepadIndex !== slotIndex
        );
        const keyboardConfig = Object.fromEntries(
          Object.entries(current.keyboardConfig)
            .map(([code, entries]): [string, ActionMap] => [
              code,
              entries.filter(
                (e) => !(e.type === 'action' && e.gamepadIndex === slotIndex)
              ),
            ])
            .filter(([, entries]) => entries.length > 0)
        );
        const next = {
          ...current,
          mouseConfig: { ...current.mouseConfig, mouseControls },
          keyboardConfig,
        };
        void persist(next);
        return { ...prev, [activeConfigName]: next };
      });
      setActiveSlots((prev) => prev.filter((_, i) => i !== tabI));
      setActiveSlotTab((prev) => Math.min(prev, activeSlots.length - 2));
      setDirty(true);
    },
    [activeSlots, activeConfigName, persist]
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
        <GamepadTabs
          count={activeSlots.length}
          activeIndex={activeSlotTab}
          onSelect={setActiveSlotTab}
          onAdd={handleAddSlot}
          onRemove={handleRemoveSlot}
        />
        <GamepadConfigSection
          key={activeSlotIndex}
          config={activeConfig}
          gamepadIndex={activeSlotIndex}
          usedIndices={activeSlots}
          onChangeIndex={(next) => {
            handleChangeSlotIndex(activeSlotIndex, next);
          }}
          onChangeKeyboard={makeUpdateKeyboardConfig(activeSlotIndex)}
          onChangeMouseStick={makeUpdateMouseStick(activeSlotIndex)}
          onChangeMouseSensitivity={makeUpdateMouseSensitivity(activeSlotIndex)}
        />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Advanced</Text>
          <KeyBindingEditor
            keyboardConfig={activeConfig.keyboardConfig}
            onChange={makeUpdateKeyboardConfig(activeSlotIndex)}
            actions={['toggleAllGamepads', 'toggleExtension']}
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

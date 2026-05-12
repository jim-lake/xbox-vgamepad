import React from 'react';
import { StyleSheet, Text, View } from '@/components/base_components';
import TextButton from '@/components/buttons/text_button';
import type { GamepadActionName } from '@/types/gamepad';
import { DEFAULT_CONFIG } from '@/types/gamepad';
import type { PopupConfig, PopupScript, ScriptBinding } from '@/types/popup';
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
import {
  gamepadConfigToPopupConfig,
  popupConfigToGamepadConfig,
} from './config';
import AppHeader from '@/components/popup/app-header';
import PresetNav from '@/components/popup/preset-nav';
import Toolbar from '@/components/popup/toolbar';
import GamepadTabs from '@/components/popup/gamepad-tabs';
import GamepadConfigSection from './gamepad-config-section';
import GlobalBindingEditor from './global-binding-editor';
import type { ScriptEntry } from './script-helpers';

const MAX_PRESETS = 25;
const DEFAULT_POPUP = gamepadConfigToPopupConfig(DEFAULT_CONFIG);

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

function updateSlot(
  popup: PopupConfig,
  idx: 0 | 1 | 2 | 3,
  patch: Partial<PopupConfig['slots'][number]>
): PopupConfig {
  const slots = [...popup.slots] as PopupConfig['slots'];
  slots[idx] = { ...slots[idx], ...patch };
  return { ...popup, slots };
}

export default function App() {
  const [loading, setLoading] = React.useState(true);
  const [isEnabled, setIsEnabled] = React.useState(true);
  const [activeConfigName, setActiveConfigName] = React.useState('default');
  const [configs, setConfigs] = React.useState<Record<string, PopupConfig>>({
    default: DEFAULT_POPUP,
  });
  const [gameName, setGameName] = React.useState<string | null>(null);
  const [renaming, setRenaming] = React.useState(false);
  const [renameValue, setRenameValue] = React.useState('');
  const [dirty, setDirty] = React.useState(false);
  const [savedConfig, setSavedConfig] =
    React.useState<PopupConfig>(DEFAULT_POPUP);
  const [activeSlotTab, setActiveSlotTab] = React.useState(0);
  const [editingScriptId, setEditingScriptId] = React.useState<string | null>(
    null
  );
  const [listeningScriptEntry, setListeningScriptEntry] =
    React.useState<ScriptEntry | null>(null);

  function clearScriptEditState() {
    setEditingScriptId(null);
    setListeningScriptEntry(null);
  }

  React.useEffect(() => {
    void (async () => {
      const [data, name] = await Promise.all([loadStorage(), getGameName()]);
      setIsEnabled(data.isEnabled);
      setActiveConfigName(data.activeConfig);
      const popupConfigs = Object.fromEntries(
        Object.entries(data.configs).map(([k, v]) => [
          k,
          gamepadConfigToPopupConfig(v),
        ])
      );
      setConfigs(popupConfigs);
      setSavedConfig(
        structuredClone(popupConfigs[data.activeConfig] ?? DEFAULT_POPUP)
      );
      setGameName(name);
      setActiveSlotTab(0);
      setLoading(false);
    })();
  }, []);

  const presetNames = React.useMemo(
    () => Object.keys(configs).sort(),
    [configs]
  );
  const activeIndex = presetNames.indexOf(activeConfigName);
  const activePopup = configs[activeConfigName] ?? DEFAULT_POPUP;
  const activeSlots = activePopup.slots
    .filter((s) => s.active)
    .map((s) => s.gamepadIndex);
  const activeSlotIndex = activeSlots[activeSlotTab] ?? 0;
  const activeSlot = activePopup.slots[activeSlotIndex];

  const persist = React.useCallback(
    async (popup: PopupConfig) => {
      const cfg = popupConfigToGamepadConfig(popup);
      if (!validateConfig(cfg)) {
        return;
      }
      await saveConfig(activeConfigName, cfg);
      if (isEnabled) {
        await sendConfigChanged(activeConfigName, cfg);
      }
    },
    [activeConfigName, isEnabled]
  );

  const handleToggle = React.useCallback(async () => {
    const next = !isEnabled;
    setIsEnabled(next);
    await setEnabled(next);
    if (next) {
      await sendActivateConfig(
        activeConfigName,
        popupConfigToGamepadConfig(configs[activeConfigName] ?? DEFAULT_POPUP)
      );
    } else {
      await sendDisableGamepad();
    }
  }, [isEnabled, activeConfigName, configs]);

  const cyclePreset = React.useCallback(
    async (dir: -1 | 1) => {
      const idx = (activeIndex + dir + presetNames.length) % presetNames.length;
      const name = presetNames[idx] ?? 'default';
      const popup = configs[name] ?? DEFAULT_POPUP;
      setActiveConfigName(name);
      setSavedConfig(structuredClone(popup));
      setDirty(false);
      setRenaming(false);
      setActiveSlotTab(0);
      clearScriptEditState();
      await setActiveConfig(name);
      if (isEnabled) {
        await sendConfigChanged(name, popupConfigToGamepadConfig(popup));
      }
    },
    [activeIndex, presetNames, isEnabled, configs]
  );

  const createPreset = React.useCallback(
    async (name: string, popup: PopupConfig) => {
      if (presetNames.length >= MAX_PRESETS) {
        return;
      }
      let uniqueName = name;
      let i = 1;
      while (presetNames.includes(uniqueName)) {
        i++;
        uniqueName = `${name} ${String(i)}`;
      }
      const cloned = structuredClone(popup);
      setConfigs((prev) => ({ ...prev, [uniqueName]: cloned }));
      setActiveConfigName(uniqueName);
      setSavedConfig(structuredClone(cloned));
      setDirty(false);
      const cfg = popupConfigToGamepadConfig(cloned);
      await saveConfig(uniqueName, cfg);
      await setActiveConfig(uniqueName);
      if (isEnabled) {
        await sendConfigChanged(uniqueName, cfg);
      }
    },
    [presetNames, isEnabled]
  );

  const handleNew = React.useCallback(
    () => createPreset('New Profile', DEFAULT_POPUP),
    [createPreset]
  );

  const handleCopy = React.useCallback(
    () => createPreset(activeConfigName, activePopup),
    [createPreset, activeConfigName, activePopup]
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
    const popup = configs[activeConfigName] ?? DEFAULT_POPUP;
    const newConfigs = Object.fromEntries(
      Object.entries(configs).filter(([k]) => k !== activeConfigName)
    );
    newConfigs[trimmed] = popup;
    setConfigs(newConfigs);
    setActiveConfigName(trimmed);
    await deleteConfig(activeConfigName);
    await saveConfig(trimmed, popupConfigToGamepadConfig(popup));
    await setActiveConfig(trimmed);
    setRenaming(false);
  }, [renameValue, activeConfigName, configs, presetNames]);

  const handleUndo = React.useCallback(() => {
    if (!dirty) {
      return;
    }
    const reverted = structuredClone(savedConfig);
    setConfigs((prev) => ({ ...prev, [activeConfigName]: reverted }));
    setDirty(false);
    clearScriptEditState();
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
            const popup = gamepadConfigToPopupConfig(parsed);
            setConfigs((prev) => ({ ...prev, [name]: popup }));
            setActiveConfigName(name);
            setSavedConfig(structuredClone(popup));
            setDirty(false);
            void saveConfig(name, parsed).then(() => setActiveConfig(name));
          }
        } catch {
          // invalid JSON, ignore
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }, [presetNames]);

  const handleExport = React.useCallback(() => {
    const blob = new Blob(
      [JSON.stringify(popupConfigToGamepadConfig(activePopup), null, 2)],
      { type: 'application/json' }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeConfigName}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [activePopup, activeConfigName]);

  const updateActivePopup = React.useCallback(
    (updater: (prev: PopupConfig) => PopupConfig) => {
      setConfigs((prev) => {
        const next = updater(prev[activeConfigName] ?? DEFAULT_POPUP);
        void persist(next);
        return { ...prev, [activeConfigName]: next };
      });
      setDirty(true);
    },
    [activeConfigName, persist]
  );

  const handleChangeBinding = React.useCallback(
    (action: GamepadActionName, code: string, op: 'add' | 'remove') => {
      updateActivePopup((popup) => {
        const slot = popup.slots[activeSlotIndex];
        const codes = slot.bindings[action];
        return updateSlot(popup, activeSlotIndex, {
          bindings: {
            ...slot.bindings,
            [action]:
              op === 'add'
                ? [...codes.filter((c) => c !== code), code]
                : codes.filter((c) => c !== code),
          },
        });
      });
    },
    [activeSlotIndex, updateActivePopup]
  );

  const handleChangeScripts = React.useCallback(
    (scriptBindings: ScriptBinding[], scripts: PopupScript[]) => {
      updateActivePopup((popup) => ({
        ...updateSlot(popup, activeSlotIndex, { scriptBindings }),
        scripts,
      }));
    },
    [activeSlotIndex, updateActivePopup]
  );

  const handleChangeMouseStick = React.useCallback(
    (val: 'left' | 'right' | undefined) => {
      updateActivePopup((popup) =>
        updateSlot(popup, activeSlotIndex, {
          mouse: { ...popup.slots[activeSlotIndex].mouse, stick: val },
        })
      );
    },
    [activeSlotIndex, updateActivePopup]
  );

  const handleChangeMouseSensitivity = React.useCallback(
    (val: number) => {
      updateActivePopup((popup) =>
        updateSlot(popup, activeSlotIndex, {
          mouse: { ...popup.slots[activeSlotIndex].mouse, sensitivity: val },
        })
      );
    },
    [activeSlotIndex, updateActivePopup]
  );

  const handleChangeGlobalBinding = React.useCallback(
    (action: GamepadActionName, code: string, op: 'add' | 'remove') => {
      updateActivePopup((popup) => {
        const codes = popup.globalBindings[action];
        return {
          ...popup,
          globalBindings: {
            ...popup.globalBindings,
            [action]:
              op === 'add'
                ? [...codes.filter((c) => c !== code), code]
                : codes.filter((c) => c !== code),
          },
        };
      });
    },
    [updateActivePopup]
  );

  const handleChangeSlotIndex = React.useCallback(
    (oldIndex: 0 | 1 | 2 | 3, newIndex: 0 | 1 | 2 | 3) => {
      const newActiveSlots = activeSlots
        .map((i) => (i === oldIndex ? newIndex : i))
        .sort((a, b) => a - b);
      setActiveSlotTab(newActiveSlots.indexOf(newIndex));
      updateActivePopup((popup) =>
        updateSlot(popup, oldIndex, { gamepadIndex: newIndex })
      );
    },
    [activeSlots, updateActivePopup]
  );

  const handleAddSlot = React.useCallback(() => {
    if (activeSlots.length >= 4) {
      return;
    }
    const next = ([0, 1, 2, 3] as const).find((i) => !activeSlots.includes(i));
    if (next === undefined) {
      return;
    }
    setActiveSlotTab(
      [...activeSlots, next].sort((a, b) => a - b).indexOf(next)
    );
    updateActivePopup((popup) => updateSlot(popup, next, { active: true }));
  }, [activeSlots, updateActivePopup]);

  const handleRemoveSlot = React.useCallback(
    (tabI: number) => {
      if (activeSlots.length <= 1) {
        return;
      }
      const slotIndex = activeSlots[tabI];
      if (slotIndex === undefined) {
        return;
      }
      setActiveSlotTab((prev) => Math.min(prev, activeSlots.length - 2));
      updateActivePopup((popup) => {
        const removedIds = new Set(
          popup.slots[slotIndex].scriptBindings.map((b) => b.scriptId)
        );
        return {
          ...updateSlot(popup, slotIndex, {
            active: false,
            bindings: Object.fromEntries(
              Object.keys(popup.slots[slotIndex].bindings).map((k) => [k, []])
            ) as unknown as PopupConfig['slots'][number]['bindings'],
            mouse: {
              stick: undefined,
              sensitivity: popup.slots[slotIndex].mouse.sensitivity,
            },
            scriptBindings: [],
          }),
          scripts: popup.scripts.filter((s) => !removedIds.has(s.scriptId)),
        };
      });
      setDirty(true);
    },
    [activeSlots, updateActivePopup]
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

      <View style={styles.topGutter} />

      <View style={styles.body}>
        <GamepadTabs
          slots={activeSlots}
          activeIndex={activeSlotTab}
          onSelect={(i) => {
            setActiveSlotTab(i);
            clearScriptEditState();
          }}
          onAdd={handleAddSlot}
        />
        <GamepadConfigSection
          slot={activeSlot}
          scripts={activePopup.scripts}
          usedIndices={activeSlots}
          gamepadCount={activeSlots.length}
          editingScriptId={editingScriptId}
          listeningScriptEntry={listeningScriptEntry}
          onEditingScriptIdChange={setEditingScriptId}
          onListeningScriptEntryChange={setListeningScriptEntry}
          onChangeIndex={(next) => {
            handleChangeSlotIndex(activeSlotIndex, next);
          }}
          onChangeBinding={handleChangeBinding}
          onChangeScripts={handleChangeScripts}
          onChangeMouseStick={handleChangeMouseStick}
          onChangeMouseSensitivity={handleChangeMouseSensitivity}
          onRemove={() => {
            handleRemoveSlot(activeSlotTab);
          }}
        />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Advanced</Text>
          <GlobalBindingEditor
            globalBindings={activePopup.globalBindings}
            onChange={handleChangeGlobalBinding}
          />
        </View>
      </View>

      {dirty && <View style={styles.bottomGutter} />}

      {dirty && (
        <View style={styles.statusBar}>
          <TextButton style={styles.undoBtn} text='Undo' onPress={handleUndo} />
          <Text style={styles.statusText}>Saved</Text>
        </View>
      )}
    </View>
  );
}

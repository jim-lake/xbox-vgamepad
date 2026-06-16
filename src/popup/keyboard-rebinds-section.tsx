import React from 'react';
import { StyleSheet, Text, View } from '@/components/base_components';
import TextButton from '@/components/buttons/text_button';
import IconButton from '@/components/buttons/icon_button';
import BindingBadges from '@/components/popup/binding-badges';
import KeyCaptureModal from '@/components/popup/key-capture-modal';
import { formatCode } from './script-helpers';
import type { KeyboardRemaps } from '@/types/popup';

import closeIcon from '@/assets/img/close.svg';

const styles = StyleSheet.create({
  section: { padding: '0.8rem', flexDirection: 'column' },
  sectionTitle: {
    color: 'var(--text-muted)',
    fontSize: '1.4rem',
    fontWeight: '600',
    marginBottom: '0.4rem',
    textTransform: 'uppercase',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  row: {
    paddingTop: '0.5rem',
    paddingBottom: '0.5rem',
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'var(--row-border)',
  },
  targetLabel: {
    color: 'var(--text-primary)',
    fontSize: '1.3rem',
    minWidth: '6rem',
  },
  badges: { flex: 1 },
  removeBtn: { marginLeft: '0.4rem' },
});

type ListenMode =
  | { type: 'add-target' }
  | { type: 'add-source'; target: string };

interface Props {
  keyboardRemaps: KeyboardRemaps;
  onChange: (remaps: KeyboardRemaps) => void;
}

export default function KeyboardRebindsSection({
  keyboardRemaps,
  onChange,
}: Props) {
  const [listenMode, setListenMode] = React.useState<ListenMode | null>(null);

  const targets = Object.keys(keyboardRemaps).sort((a, b) =>
    a.localeCompare(b)
  );

  React.useEffect(() => {
    if (listenMode === null) {
      return;
    }

    function handleKeyDown(e: KeyboardEvent) {
      e.preventDefault();
      e.stopPropagation();
      if (listenMode === null) {
        return;
      }
      const code = e.code;
      if (listenMode.type === 'add-target') {
        if (code in keyboardRemaps) {
          setListenMode(null);
          return;
        }
        onChange({ ...keyboardRemaps, [code]: [] });
      } else {
        const existing = keyboardRemaps[listenMode.target] ?? [];
        if (!existing.includes(code)) {
          onChange({
            ...keyboardRemaps,
            [listenMode.target]: [...existing, code],
          });
        }
      }
      setListenMode(null);
    }

    function handleMouseDown(e: MouseEvent) {
      e.preventDefault();
      e.stopPropagation();
    }

    document.addEventListener('keydown', handleKeyDown, true);
    document.addEventListener('mousedown', handleMouseDown, true);
    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
      document.removeEventListener('mousedown', handleMouseDown, true);
    };
  }, [listenMode, keyboardRemaps, onChange]);

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <Text style={styles.sectionTitle}>Keyboard Rebinds</Text>
        <TextButton
          text='Add Target'
          type='green'
          onPress={() => {
            setListenMode({ type: 'add-target' });
          }}
        />
      </View>
      {targets.map((target) => {
        const sources = keyboardRemaps[target] ?? [];
        return (
          <View key={target} style={styles.row}>
            <Text style={styles.targetLabel}>{formatCode(target)}</Text>
            <View style={styles.badges}>
              <BindingBadges
                codes={sources}
                onAdd={() => {
                  setListenMode({ type: 'add-source', target });
                }}
                onRemove={(code) => {
                  onChange({
                    ...keyboardRemaps,
                    [target]: sources.filter((s) => s !== code),
                  });
                }}
              />
            </View>
            <IconButton
              style={styles.removeBtn}
              source={closeIcon}
              type='danger'
              onPress={() => {
                const next = Object.fromEntries(
                  Object.entries(keyboardRemaps).filter(([k]) => k !== target)
                );
                onChange(next);
              }}
            />
          </View>
        );
      })}
      {listenMode !== null && (
        <KeyCaptureModal
          allowEscape
          onClose={() => {
            setListenMode(null);
          }}
        />
      )}
    </View>
  );
}

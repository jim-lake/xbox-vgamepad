import React from 'react';
import { StyleSheet, View } from '@/components/base_components';
import IconButton from '@/components/buttons/icon_button';
import SectionHeader from '@/components/popup/section-header';
import BindingBadges from '@/components/popup/binding-badges';
import FormRow from '@/components/popup/form-row';
import KeyCaptureModal from '@/components/popup/key-capture-modal';
import { formatCode } from './script-helpers';
import type { KeyboardRemaps } from '@/types/popup';

import closeIcon from '@/assets/img/close.svg';

const styles = StyleSheet.create({
  section: { padding: '0.8rem', flexDirection: 'column' },
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

  const targets = [...keyboardRemaps.keys()].sort((a, b) =>
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
        if (keyboardRemaps.has(code)) {
          setListenMode(null);
          return;
        }
        onChange(new Map([...keyboardRemaps, [code, []]]));
      } else {
        const existing = keyboardRemaps.get(listenMode.target) ?? [];
        if (!existing.includes(code)) {
          onChange(
            new Map([...keyboardRemaps, [listenMode.target, [...existing, code]]])
          );
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
      <SectionHeader
        title='Keyboard Rebinds'
        buttonText='Add Target'
        buttonType='green'
        onPress={() => {
          setListenMode({ type: 'add-target' });
        }}
      />
      {targets.map((target) => {
        const sources = keyboardRemaps.get(target) ?? [];
        return (
          <FormRow key={target} label={formatCode(target)}>
            <View style={styles.badges}>
              <BindingBadges
                codes={sources}
                onAdd={() => {
                  setListenMode({ type: 'add-source', target });
                }}
                onRemove={(code) => {
                  onChange(
                    new Map([
                      ...keyboardRemaps,
                      [target, sources.filter((s) => s !== code)],
                    ])
                  );
                }}
              />
            </View>
            <IconButton
              style={styles.removeBtn}
              source={closeIcon}
              type='danger'
              onPress={() => {
                const next = new Map(keyboardRemaps);
                next.delete(target);
                onChange(next);
              }}
            />
          </FormRow>
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

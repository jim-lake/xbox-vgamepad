import {
  StyleSheet,
  Text,
  TextInput,
  View,
} from '@/components/base_components';
import TextButton from '@/components/buttons/text_button';

const styles = StyleSheet.create({
  presetNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '1rem',
    backgroundColor: 'var(--surface-bg)',
  },
  navArrow: {
    color: 'var(--text-primary)',
    fontSize: '1.6rem',
    cursor: 'pointer',
    paddingLeft: '1rem',
    paddingRight: '1rem',
  },
  navArrowDisabled: { opacity: 0.3, cursor: 'default' },
  navLabel: {
    color: 'var(--text-primary)',
    fontSize: '1.6rem',
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
  renameInput: {
    flex: 1,
    backgroundColor: 'var(--input-bg)',
    color: 'var(--text-primary)',
    fontSize: '1.4rem',
    padding: '0.6rem 0.8rem',
    borderRadius: '1rem',
    borderWidth: 1,
    borderColor: 'var(--surface-border)',
  },
});

interface Props {
  activeConfigName: string;
  renaming: boolean;
  renameValue: string;
  onRenameChange: (val: string) => void;
  onRenameSubmit: () => void;
  onPrev: () => void;
  onNext: () => void;
}

export default function PresetNav({
  activeConfigName,
  renaming,
  renameValue,
  onRenameChange,
  onRenameSubmit,
  onPrev,
  onNext,
}: Props) {
  return (
    <View style={styles.presetNav}>
      <TextButton
        style={[
          styles.navArrow,
          renaming ? styles.navArrowDisabled : undefined,
        ]}
        text='◀'
        disabled={renaming}
        onPress={onPrev}
      />
      {renaming ? (
        <View style={styles.renameRow}>
          <TextInput
            style={styles.renameInput}
            value={renameValue}
            onChangeText={onRenameChange}
            onSubmitEditing={onRenameSubmit}
            autoFocus
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
        onPress={onNext}
      />
    </View>
  );
}

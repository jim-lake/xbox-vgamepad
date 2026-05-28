import {
  StyleSheet,
  Text,
  TextInput,
  View,
} from '@/components/base_components';
import TextButton from '@/components/buttons/text_button';
import Select from '@/components/select';
import type { GamepadActionName, OtherGamepadMode } from '@/types/gamepad';
import type { GlobalBindings } from '@/types/popup';
import GlobalBindingEditor from '@/popup/global-binding-editor';

const styles = StyleSheet.create({
  section: { padding: '0.8rem', flexDirection: 'column' },
  sectionTitle: {
    color: 'var(--text-muted)',
    fontSize: '1.4rem',
    fontWeight: '600',
    marginBottom: '0.4rem',
    textTransform: 'uppercase',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: '0.5rem',
    paddingBottom: '0.5rem',
    borderBottomWidth: 1,
    borderBottomColor: 'var(--row-border)',
  },
  label: { width: '10rem', color: 'var(--text-muted)', fontSize: '1.4rem' },
  renameInput: {
    flex: 1,
    marginRight: '1.5rem',
    backgroundColor: 'var(--input-bg)',
    color: 'var(--text-primary)',
    fontSize: '1.4rem',
    padding: '0.6rem 0.8rem',
    borderRadius: '0.6rem',
    borderWidth: 1,
    borderColor: 'var(--surface-border)',
  },
  buttons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: '0.5rem',
    margin: '1rem',
    justifyContent: 'center',
  },
});

interface Props {
  globalBindings: GlobalBindings;
  onChangeGlobalBinding: (
    action: GamepadActionName,
    code: string,
    op: 'add' | 'remove'
  ) => void;
  otherGamepadMode: OtherGamepadMode;
  onChangeOtherGamepadMode: (value: string) => void;
  renameValue: string;
  onRenameValueChange: (value: string) => void;
  onRenameSubmit: () => void;
  onCopy: () => void;
  onImport: () => void;
  onExport: () => void;
  onDelete: () => void;
  showDelete: boolean;
  showWipe: boolean;
  onWipe: () => void;
}

export default function AdvancedSection({
  globalBindings,
  onChangeGlobalBinding,
  otherGamepadMode,
  onChangeOtherGamepadMode,
  renameValue,
  onRenameValueChange,
  onRenameSubmit,
  onCopy,
  onImport,
  onExport,
  onDelete,
  showDelete,
  showWipe,
  onWipe,
}: Props) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Advanced</Text>
      <GlobalBindingEditor
        globalBindings={globalBindings}
        onChange={onChangeGlobalBinding}
      />
      <View style={styles.row}>
        <Text style={styles.label}>Physical Gamepads</Text>
        <Select
          value={otherGamepadMode}
          options={[
            { value: 'separate', text: 'Separate' },
            { value: 'combine', text: 'Combine' },
          ]}
          onChange={onChangeOtherGamepadMode}
        />
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Rename Profile</Text>
        <TextInput
          style={styles.renameInput}
          value={renameValue}
          onChangeText={onRenameValueChange}
          onSubmitEditing={onRenameSubmit}
        />
        <TextButton type='green' text='Save' onPress={onRenameSubmit} />
      </View>
      <View style={styles.buttons}>
        <TextButton text='Copy' onPress={onCopy} />
        <TextButton text='Import' onPress={onImport} />
        <TextButton text='Export' onPress={onExport} />
        {showDelete && (
          <TextButton type='danger' text='Delete' onPress={onDelete} />
        )}
        {showWipe && <TextButton type='danger' text='Wipe' onPress={onWipe} />}
      </View>
    </View>
  );
}

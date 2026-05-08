import { StyleSheet, View } from '@/components/base_components';
import TextButton from '@/components/buttons/text_button';

const styles = StyleSheet.create({
  toolbar: {
    flexDirection: 'row',
    padding: '0.5rem',
    gap: '0.5rem',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  toolBtn: {},
});

interface NormalProps {
  renaming: false;
  onNew: () => void;
  onCopy: () => void;
  onImport: () => void;
  onExport: () => void;
  onRename: () => void;
  onWipe?: () => void;
}

interface RenamingProps {
  renaming: true;
  onSaveRename: () => void;
  onCancelRename: () => void;
}

type Props = NormalProps | RenamingProps;

export default function Toolbar(props: Props) {
  return (
    <View style={styles.toolbar}>
      {props.renaming ? (
        <>
          <TextButton
            style={styles.toolBtn}
            type='green'
            text='Save'
            onPress={props.onSaveRename}
          />
          <TextButton
            style={styles.toolBtn}
            text='Cancel'
            onPress={props.onCancelRename}
          />
        </>
      ) : (
        <>
          <TextButton style={styles.toolBtn} text='New' onPress={props.onNew} />
          <TextButton
            style={styles.toolBtn}
            text='Copy'
            onPress={props.onCopy}
          />
          <TextButton
            style={styles.toolBtn}
            text='Import'
            onPress={props.onImport}
          />
          <TextButton
            style={styles.toolBtn}
            text='Export'
            onPress={props.onExport}
          />
          <TextButton
            style={styles.toolBtn}
            text='Rename'
            onPress={props.onRename}
          />
          {props.onWipe !== undefined && (
            <TextButton type='danger' text='Wipe' onPress={props.onWipe} />
          )}
        </>
      )}
    </View>
  );
}

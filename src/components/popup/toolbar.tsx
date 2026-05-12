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
  onRename: () => void;
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
        <TextButton
          style={styles.toolBtn}
          text='Rename'
          onPress={props.onRename}
        />
      )}
    </View>
  );
}

import {
  StyleSheet,
  TouchableWithoutFeedback,
  View,
} from '@/components/base_components';

const styles = StyleSheet.create({
  toggle: {
    width: '4rem',
    height: '2.2rem',
    borderRadius: '1.1rem',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  toggleOn: { backgroundColor: 'var(--toggle-on-bg)', alignItems: 'flex-end' },
  toggleOff: {
    backgroundColor: 'var(--toggle-off-bg)',
    alignItems: 'flex-start',
  },
  knob: {
    width: '1.8rem',
    height: '1.8rem',
    borderRadius: '0.9rem',
    backgroundColor: 'var(--toggle-knob)',
    marginLeft: '0.2rem',
    marginRight: '0.2rem',
  },
  disabled: { opacity: 0.5, cursor: 'default' },
});

interface Props {
  value: boolean;
  onValueChange?: (value: boolean) => void;
  disabled?: boolean;
}

export default function Switch({ value, onValueChange, disabled }: Props) {
  return (
    <TouchableWithoutFeedback
      onPress={() => {
        if (!disabled) {
          onValueChange?.(!value);
        }
      }}
    >
      <View
        style={[
          styles.toggle,
          value ? styles.toggleOn : styles.toggleOff,
          disabled ? styles.disabled : undefined,
        ]}
      >
        <View style={styles.knob} />
      </View>
    </TouchableWithoutFeedback>
  );
}

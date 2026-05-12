import { StyleSheet, Text, View } from '@/components/base_components';
import TextButton from '@/components/buttons/text_button';
import Range from '@/components/range';
import type { MouseControlTarget } from '@/types/gamepad';
import { DEFAULT_SENSITIVITY } from '@/types/gamepad';

const styles = StyleSheet.create({
  container: { flexDirection: 'column', gap: '0.6rem' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: '1rem',
    paddingTop: '1rem',
    gap: '1rem',
    borderBottomWidth: 1,
    borderBottomColor: 'var(--row-border)',
  },
  label: { color: 'var(--text-muted)', fontSize: '1.4rem', width: '10rem' },
  option: {
    paddingLeft: '0.6rem',
    paddingRight: '0.6rem',
    borderRadius: '1rem',
  },
  optionActive: { backgroundColor: 'var(--chip-active-bg)' },
  optionActiveText: { color: 'var(--text-on-color)' },
  sensitivityValue: {
    color: 'var(--text-primary)',
    fontSize: '1.4rem',
    width: '3rem',
  },
  rangeInput: { flex: 1, margin: '0.6rem 0' },
});

interface Props {
  mouseControls: MouseControlTarget[];
  onChangeStick: (val: 'left' | 'right' | undefined) => void;
  onChangeSensitivity: (val: number) => void;
}

const STICK_OPTIONS: { label: string; value: 'left' | 'right' | undefined }[] =
  [
    { label: 'None', value: undefined },
    { label: 'Left', value: 'left' },
    { label: 'Right', value: 'right' },
  ];

export default function MouseSettings({
  mouseControls,
  onChangeStick,
  onChangeSensitivity,
}: Props) {
  const target = mouseControls[0];
  const currentStick = target?.stick;
  const sensitivity = target?.sensitivity ?? DEFAULT_SENSITIVITY;
  // Display sensitivity inverted: higher display = more sensitive
  // Stored as divisor: higher stored = less sensitive
  // Display = 1001 - stored
  const displaySensitivity = 1001 - sensitivity;

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Text style={styles.label}>Stick</Text>
        {STICK_OPTIONS.map(({ label, value }) => (
          <TextButton
            key={label}
            style={[
              styles.option,
              currentStick === value ? styles.optionActive : undefined,
            ]}
            textStyle={
              currentStick === value ? styles.optionActiveText : undefined
            }
            text={label}
            onPress={() => {
              onChangeStick(value);
            }}
          />
        ))}
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Sensitivity</Text>
        <Range
          style={styles.rangeInput}
          min={1}
          max={1000}
          value={displaySensitivity}
          onChange={(v) => {
            onChangeSensitivity(1001 - v);
          }}
        />
        <Text style={styles.sensitivityValue}>{displaySensitivity}</Text>
      </View>
    </View>
  );
}

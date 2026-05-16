import { StyleSheet, Text, View } from '@/components/base_components';
import TextButton from '@/components/buttons/text_button';
import Range from '@/components/range';
import FormRow from './form-row';
import type { MouseControlTarget } from '@/types/gamepad';
import { DEFAULT_SENSITIVITY } from '@/types/gamepad';

const styles = StyleSheet.create({
  container: { flexDirection: 'column', gap: '0.6rem' },
  stickOptions: { flexDirection: 'row', gap: '0.6rem', alignItems: 'center' },
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
  const displaySensitivity = 1001 - sensitivity;

  return (
    <View style={styles.container}>
      <FormRow label='Stick'>
        <View style={styles.stickOptions}>
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
      </FormRow>
      <FormRow label='Sensitivity'>
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
      </FormRow>
    </View>
  );
}

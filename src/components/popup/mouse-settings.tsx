import { StyleSheet, View } from '@/components/base_components';
import TextButton from '@/components/buttons/text_button';
import RangeNumberInput from './range-number-input';
import FormRow from './form-row';
import type { SlotMouse } from '@/types/popup';

const styles = StyleSheet.create({
  container: { flexDirection: 'column', gap: '0.6rem' },
  stickOptions: { flexDirection: 'row', gap: '0.6rem', alignItems: 'center' },
  option: {
    paddingLeft: '0.6rem',
    paddingRight: '0.6rem',
    borderRadius: '1rem',
  },
  optionInactive: { backgroundColor: 'var(--chip-bg)' },
  optionInactiveText: { color: 'var(--text-primary)' },
  optionActive: { backgroundColor: 'var(--chip-active-bg)' },
  optionActiveText: { color: 'var(--text-on-color)' },
});

interface Props {
  mouse: SlotMouse;
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
  mouse,
  onChangeStick,
  onChangeSensitivity,
}: Props) {
  return (
    <View style={styles.container}>
      <FormRow label='Stick'>
        <View style={styles.stickOptions}>
          {STICK_OPTIONS.map(({ label, value }) => {
            const active = mouse.stick === value;
            return (
              <TextButton
                key={label}
                style={[
                  styles.option,
                  active ? styles.optionActive : styles.optionInactive,
                ]}
                textStyle={
                  active ? styles.optionActiveText : styles.optionInactiveText
                }
                text={label}
                onPress={() => {
                  onChangeStick(value);
                }}
              />
            );
          })}
        </View>
      </FormRow>
      <FormRow label='Sensitivity'>
        <RangeNumberInput
          min={1}
          max={2000}
          value={mouse.sensitivity}
          onChange={onChangeSensitivity}
        />
      </FormRow>
    </View>
  );
}

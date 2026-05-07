import React from 'react';
import { StyleSheet, Text, View } from '@/components/base_components';
import TextButton from '@/components/buttons/text_button';

const styles = StyleSheet.create({
  container: { flexDirection: 'column', gap: '0.6rem' },
  row: { flexDirection: 'row', alignItems: 'center', gap: '0.8rem' },
  label: { color: '#94a3b8', fontSize: '1.4rem', width: '7rem' },
  option: {
    paddingLeft: '0.6rem',
    paddingRight: '0.6rem',
    paddingTop: '0.3rem',
    paddingBottom: '0.3rem',
    borderRadius: '0.3rem',
    backgroundColor: '#0f3460',
  },
  optionActive: { backgroundColor: '#107c10' },
  sensitivityValue: { color: '#e2e8f0', fontSize: '1.4rem', width: '3rem' },
});

interface Props {
  mouseControls: 0 | 1 | undefined;
  sensitivity: number;
  onChangeStick: (val: 0 | 1 | undefined) => void;
  onChangeSensitivity: (val: number) => void;
}

const STICK_OPTIONS: { label: string; value: 0 | 1 | undefined }[] = [
  { label: 'None', value: undefined },
  { label: 'Left', value: 0 },
  { label: 'Right', value: 1 },
];

export default function MouseSettings({
  mouseControls,
  sensitivity,
  onChangeStick,
  onChangeSensitivity,
}: Props) {
  // Display sensitivity inverted: higher display = more sensitive
  // Stored as divisor: higher stored = less sensitive
  // Display = 1001 - stored
  const displaySensitivity = 1001 - sensitivity;

  const handleSensitivityChange = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const display = Number(e.target.value);
      onChangeSensitivity(1001 - display);
    },
    [onChangeSensitivity]
  );

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Text style={styles.label}>Stick</Text>
        {STICK_OPTIONS.map(({ label, value }) => (
          <TextButton
            key={label}
            style={[
              styles.option,
              mouseControls === value ? styles.optionActive : undefined,
            ]}
            text={label}
            onPress={() => {
              onChangeStick(value);
            }}
          />
        ))}
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Sensitivity</Text>
        <input
          type='range'
          min={1}
          max={1000}
          value={displaySensitivity}
          onChange={handleSensitivityChange}
          style={{ flex: 1 }}
        />
        <Text style={styles.sensitivityValue}>{displaySensitivity}</Text>
      </View>
    </View>
  );
}

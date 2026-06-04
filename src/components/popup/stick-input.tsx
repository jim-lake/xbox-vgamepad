import {
  StyleSheet,
  Text,
  View,
  TextInput,
} from '@/components/base_components';
import type { StyleInput } from '@/components/base_components';
import XYPad from '@/components/xy_pad';
import type { XY } from '@/components/xy_pad';
import React from 'react';

interface NumericInputProps {
  style?: StyleInput;
  value: number;
  min?: number;
  max?: number;
  onChange: (n: number) => void;
}

function NumericInput({ style, value, min, max, onChange }: NumericInputProps) {
  const [state, setState] = React.useState({ text: String(value), value });

  if (value !== state.value) {
    const parsed = parseFloat(state.text);
    if (parsed !== value) {
      setState({ text: String(value), value });
    } else {
      setState({ text: state.text, value });
    }
  }

  return (
    <TextInput
      style={style}
      value={state.text}
      onChangeText={(v) => {
        const n = parseFloat(v);
        if (
          !isNaN(n) &&
          (min === undefined || n >= min) &&
          (max === undefined || n <= max)
        ) {
          setState({ text: v, value: n });
          onChange(n);
        } else {
          setState({ text: v, value: state.value });
        }
      }}
    />
  );
}

interface StickInputProps {
  value: XY;
  onChange: (pos: Readonly<XY>) => void;
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', gap: '0.5rem' },
  pad: { width: 60, height: 60 },
  fields: { flexDirection: 'column', gap: '0.3rem' },
  fieldRow: { flexDirection: 'row', alignItems: 'center', gap: '0.3rem' },
  label: { fontSize: '1.2rem', color: 'var(--text-muted)' },
  numInput: {
    color: 'var(--text-primary)',
    fontSize: '1.2rem',
    borderWidth: 1,
    borderRadius: '0.3rem',
    padding: '0.2rem 0.4rem',
    backgroundColor: 'var(--input-bg)',
    width: '5.5rem',
  },
});

export default function StickInput({ value, onChange }: StickInputProps) {
  return (
    <View style={styles.container}>
      <XYPad
        style={styles.pad}
        value={{ x: value.x, y: -value.y }}
        onChange={(pos) => {
          onChange({ x: pos.x, y: -pos.y });
        }}
      />
      <View style={styles.fields}>
        <View style={styles.fieldRow}>
          <Text style={styles.label}>X</Text>
          <NumericInput
            style={styles.numInput}
            value={value.x}
            min={-1}
            max={1}
            onChange={(n) => {
              onChange({ x: n, y: value.y });
            }}
          />
        </View>
        <View style={styles.fieldRow}>
          <Text style={styles.label}>Y</Text>
          <NumericInput
            style={styles.numInput}
            value={value.y}
            min={-1}
            max={1}
            onChange={(n) => {
              onChange({ x: value.x, y: n });
            }}
          />
        </View>
      </View>
    </View>
  );
}

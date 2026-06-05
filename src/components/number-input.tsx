import React from 'react';
import { StyleSheet, TextInput } from '@/components/base_components';
import type { StyleInput } from '@/components/base_components';

const styles = StyleSheet.create({
  numberInput: {
    color: 'var(--text-primary)',
    fontSize: '1.4rem',
    borderWidth: 1,
    borderRadius: '0.4rem',
    padding: '0.4rem 0.5rem',
    backgroundColor: 'var(--input-bg)',
    width: '7rem',
  },
});

interface NumberInputProps {
  style?: StyleInput;
  value: number;
  min?: number;
  max?: number;
  integer?: boolean;
  onChange: (n: number) => void;
}

export default function NumberInput({
  style,
  value,
  min,
  max,
  integer = false,
  onChange,
}: NumberInputProps) {
  const [state, setState] = React.useState({ text: String(value), value });

  if (value !== state.value) {
    const parsed = integer ? parseInt(state.text, 10) : parseFloat(state.text);
    if (parsed !== value) {
      setState({ text: String(value), value });
    } else {
      setState({ text: state.text, value });
    }
  }

  return (
    <TextInput
      style={[styles.numberInput, style]}
      value={state.text}
      onBlur={() => {
        const n = integer ? parseInt(state.text, 10) : parseFloat(state.text);
        const clamped = isNaN(n)
          ? value
          : Math.max(min ?? -Infinity, Math.min(max ?? Infinity, n));
        setState({ text: String(clamped), value: clamped });
        if (clamped !== value) {
          onChange(clamped);
        }
      }}
      onChangeText={(v) => {
        const n = integer ? parseInt(v, 10) : parseFloat(v);
        if (!isNaN(n)) {
          const clamped = Math.max(
            min ?? -Infinity,
            Math.min(max ?? Infinity, n)
          );
          setState({ text: v, value: clamped });
          onChange(clamped);
        } else {
          setState({ text: v, value: state.value });
        }
      }}
    />
  );
}

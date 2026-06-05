import React from 'react';
import { TextInput } from '@/components/base_components';
import type { StyleInput } from '@/components/base_components';

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
      style={style}
      value={state.text}
      onChangeText={(v) => {
        const n = integer ? parseInt(v, 10) : parseFloat(v);
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

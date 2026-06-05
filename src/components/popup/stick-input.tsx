import { StyleSheet, Text, View } from '@/components/base_components';
import XYPad from '@/components/xy_pad';
import type { XY } from '@/components/xy_pad';
import NumericInput from '@/components/numeric-input';
import React from 'react';

interface StickInputProps {
  value: XY;
  onChange: (pos: Readonly<XY>) => void;
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', gap: '0.6rem' },
  pad: { width: 60, height: 60 },
  fields: { flexDirection: 'column', gap: '0.4rem' },
  fieldRow: { flexDirection: 'row', alignItems: 'center', gap: '0.4rem' },
  label: { fontSize: '1.3rem', fontWeight: '500', color: 'var(--text-muted)' },
  numInput: {
    color: 'var(--text-primary)',
    fontSize: '1.4rem',
    borderWidth: 1,
    borderRadius: '0.4rem',
    padding: '0.4rem 0.5rem',
    backgroundColor: 'var(--input-bg)',
    width: '7rem',
  },
});

export default function StickInput({ value, onChange }: StickInputProps) {
  const [local, setLocal] = React.useState(value);

  if (local.x !== value.x || local.y !== value.y) {
    setLocal(value);
  }

  return (
    <View style={styles.container}>
      <XYPad
        style={styles.pad}
        value={{ x: local.x, y: -local.y }}
        onChange={(pos) => {
          setLocal({ x: pos.x, y: -pos.y });
        }}
        onDragDone={(pos) => {
          onChange({ x: pos.x, y: -pos.y });
        }}
      />
      <View style={styles.fields}>
        <View style={styles.fieldRow}>
          <Text style={styles.label}>X</Text>
          <NumericInput
            style={styles.numInput}
            value={local.x}
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
            value={local.y}
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

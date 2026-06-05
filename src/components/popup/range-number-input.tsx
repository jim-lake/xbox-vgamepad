import React from 'react';
import { StyleSheet, View } from '@/components/base_components';
import Range from '@/components/range';
import NumberInput from '@/components/number-input';
import { useLatestCallback } from '@/tools/latest_callback';

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  range: { flex: 1, marginRight: '0.8rem' },
});

interface Props {
  min: number;
  max: number;
  value: number;
  onChange: (value: number) => void;
}

export default function RangeNumberInput({ min, max, value, onChange }: Props) {
  const [dragValue, setDragValue] = React.useState<number | null>(null);
  const [prevValue, setPrevValue] = React.useState(value);

  if (value !== prevValue) {
    setPrevValue(value);
    setDragValue(null);
  }

  const displayValue = Math.max(min, Math.min(max, dragValue ?? value));
  const lastDragRef = React.useRef<number | null>(null);

  const handleRangeChange = useLatestCallback((v: number) => {
    lastDragRef.current = v;
    setDragValue(v);
  });

  const handleCommit = useLatestCallback(() => {
    const v = lastDragRef.current;
    if (v !== null) {
      lastDragRef.current = null;
      onChange(v);
    }
  });

  const handleNumberChange = useLatestCallback((v: number) => {
    setDragValue(null);
    lastDragRef.current = null;
    onChange(v);
  });

  return (
    <View style={styles.container}>
      <Range
        style={styles.range}
        min={min}
        max={max}
        value={displayValue}
        onChange={handleRangeChange}
        onMouseUp={handleCommit}
        onTouchEnd={handleCommit}
      />
      <NumberInput
        min={min}
        max={max}
        value={displayValue}
        integer
        onChange={handleNumberChange}
      />
    </View>
  );
}

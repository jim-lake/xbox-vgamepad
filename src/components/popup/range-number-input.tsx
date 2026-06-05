import React from 'react';
import { StyleSheet, View } from '@/components/base_components';
import Range from '@/components/range';
import NumberInput from '@/components/number-input';

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
  const displayValue = dragValue ?? value;

  const handleRangeChange = React.useCallback((v: number) => {
    setDragValue(v);
  }, []);

  const handleDragEnd = React.useCallback(
    (
      e: React.MouseEvent<HTMLInputElement> | React.TouchEvent<HTMLInputElement>
    ) => {
      setDragValue(null);
      onChange(Number((e.target as HTMLInputElement).value));
    },
    [onChange]
  );

  return (
    <View style={styles.container}>
      <Range
        style={styles.range}
        min={min}
        max={max}
        value={displayValue}
        onChange={handleRangeChange}
        onMouseUp={handleDragEnd}
        onTouchEnd={handleDragEnd}
      />
      <NumberInput
        min={min}
        max={max}
        value={displayValue}
        integer
        onChange={onChange}
      />
    </View>
  );
}

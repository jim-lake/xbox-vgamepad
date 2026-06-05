import { StyleSheet, View } from '@/components/base_components';
import Range from '@/components/range';
import NumberInput from '@/components/number-input';

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  range: { flex: 1, marginRight: '0.8rem' },
  number: { width: '5rem' },
});

interface Props {
  min: number;
  max: number;
  value: number;
  onChange: (value: number) => void;
}

export default function RangeNumberInput({ min, max, value, onChange }: Props) {
  return (
    <View style={styles.container}>
      <Range
        style={styles.range}
        min={min}
        max={max}
        value={value}
        onChange={onChange}
      />
      <NumberInput
        style={styles.number}
        min={min}
        max={max}
        value={value}
        integer
        onChange={onChange}
      />
    </View>
  );
}

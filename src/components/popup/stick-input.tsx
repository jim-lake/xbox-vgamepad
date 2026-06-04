import { StyleSheet, View } from '@/components/base_components';
import XYPad from '@/components/xy_pad';
import type { XY } from '@/components/xy_pad';

interface StickInputProps {
  value: XY;
  onChange: (pos: Readonly<XY>) => void;
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', gap: '0.5rem' },
  pad: { width: 60, height: 60 },
});

export default function StickInput({ value, onChange }: StickInputProps) {
  return (
    <View style={styles.container}>
      <XYPad style={styles.pad} value={value} onChange={onChange} />
    </View>
  );
}

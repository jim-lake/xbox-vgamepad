import { StyleSheet, Text, View, TouchableHighlight } from './base_components';
import type { StyleInput } from './base_components';

const styles = StyleSheet.create({
  container: {
    width: '2.2rem',
    height: '2.2rem',
    borderRadius: '0.3rem',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  icon: { fontSize: '1.4rem', textAlign: 'center' },
});

interface Props {
  icon: string;
  style?: StyleInput;
  iconStyle?: StyleInput;
  onPress: () => void;
  underlayColor?: string;
}

export default function IconButton({
  icon,
  style,
  iconStyle,
  onPress,
  underlayColor,
}: Props) {
  return (
    <View style={[styles.container, style]}>
      <Text style={[styles.icon, iconStyle]}>{icon}</Text>
      <TouchableHighlight
        style={StyleSheet.absoluteFill}
        underlayColor={underlayColor ?? 'rgba(0,0,0,0.2)'}
        onPress={onPress}
      >
        <View style={StyleSheet.absoluteFill} />
      </TouchableHighlight>
    </View>
  );
}

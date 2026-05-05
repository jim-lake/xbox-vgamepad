import { StyleSheet, Text, View } from '@/components/base_components';

const styles = StyleSheet.create({
  app: { width: 200, flexDirection: 'column' },
  text: { color: '#333', fontSize: '1.5rem' },
});

export default function App() {
  return (
    <View style={styles.app}>
      <Text style={styles.text}>Xbox Virtual Gamepad v8</Text>
      <Text style={styles.text}>Version: {window.__VERSION__ ?? 'dev'}</Text>
    </View>
  );
}

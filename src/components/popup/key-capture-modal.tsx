import React from 'react';
import { StyleSheet, Text, View } from '@/components/base_components';
import TextButton from '@/components/buttons/text_button';

const styles = StyleSheet.create({
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'var(--modal-overlay)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  content: {
    backgroundColor: 'var(--app-bg)',
    padding: '2rem',
    borderRadius: '1rem',
    alignItems: 'center',
  },
  title: {
    color: 'var(--text-primary)',
    fontSize: '1.4rem',
    marginBottom: '1rem',
  },
  sub: { color: 'var(--text-muted)', fontSize: '1.3rem', marginBottom: '1rem' },
  cancelBtn: { marginTop: '0.5rem' },
});

interface Props {
  onClose: () => void;
  allowEscape?: boolean;
}

export default function KeyCaptureModal({ onClose, allowEscape }: Props) {
  return (
    <View style={styles.overlay}>
      <View style={styles.content}>
        <Text style={styles.title}>Press a key or mouse button</Text>
        {!allowEscape && <Text style={styles.sub}>Escape to cancel</Text>}
        <View
          style={styles.cancelBtn}
          onMouseDown={(e: React.MouseEvent) => {
            e.stopPropagation();
          }}
        >
          <TextButton text='Cancel' onPress={onClose} />
        </View>
      </View>
    </View>
  );
}

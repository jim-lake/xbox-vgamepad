import React from 'react';
import { StyleSheet, Text, View } from '@/components/base_components';
import TextButton from '@/components/buttons/text_button';
import Select from '@/components/select';

const KEY_OPTIONS: { value: string; text: string }[] = [
  { value: '', text: 'Or select manually…', disabled: true } as {
    value: string;
    text: string;
  },
  { value: 'Click', text: 'Left Click' },
  { value: 'RightClick', text: 'Right Click' },
  { value: 'Scroll', text: 'Scroll Wheel' },
  { value: 'KeyW', text: 'W' },
  { value: 'KeyA', text: 'A' },
  { value: 'KeyS', text: 'S' },
  { value: 'KeyD', text: 'D' },
  { value: 'KeyQ', text: 'Q' },
  { value: 'KeyE', text: 'E' },
  { value: 'KeyR', text: 'R' },
  { value: 'KeyF', text: 'F' },
  { value: 'KeyG', text: 'G' },
  { value: 'KeyZ', text: 'Z' },
  { value: 'KeyX', text: 'X' },
  { value: 'KeyC', text: 'C' },
  { value: 'KeyV', text: 'V' },
  { value: 'KeyB', text: 'B' },
  { value: 'KeyN', text: 'N' },
  { value: 'KeyM', text: 'M' },
  { value: 'KeyH', text: 'H' },
  { value: 'KeyI', text: 'I' },
  { value: 'KeyJ', text: 'J' },
  { value: 'KeyK', text: 'K' },
  { value: 'KeyL', text: 'L' },
  { value: 'KeyO', text: 'O' },
  { value: 'KeyP', text: 'P' },
  { value: 'KeyT', text: 'T' },
  { value: 'KeyU', text: 'U' },
  { value: 'KeyY', text: 'Y' },
  { value: 'Digit1', text: '1' },
  { value: 'Digit2', text: '2' },
  { value: 'Digit3', text: '3' },
  { value: 'Digit4', text: '4' },
  { value: 'Digit5', text: '5' },
  { value: 'Digit6', text: '6' },
  { value: 'Digit7', text: '7' },
  { value: 'Digit8', text: '8' },
  { value: 'Digit9', text: '9' },
  { value: 'Digit0', text: '0' },
  { value: 'Space', text: 'Space' },
  { value: 'Enter', text: 'Enter' },
  { value: 'Tab', text: 'Tab' },
  { value: 'ShiftLeft', text: 'Left Shift' },
  { value: 'ShiftRight', text: 'Right Shift' },
  { value: 'ControlLeft', text: 'Left Control' },
  { value: 'ControlRight', text: 'Right Control' },
  { value: 'AltLeft', text: 'Left Alt' },
  { value: 'AltRight', text: 'Right Alt' },
  { value: 'ArrowUp', text: '↑' },
  { value: 'ArrowDown', text: '↓' },
  { value: 'ArrowLeft', text: '←' },
  { value: 'ArrowRight', text: '→' },
  { value: 'Backspace', text: 'Backspace' },
  { value: 'CapsLock', text: 'Caps Lock' },
  { value: 'Minus', text: '-' },
  { value: 'Equal', text: '=' },
  { value: 'BracketLeft', text: '[' },
  { value: 'BracketRight', text: ']' },
  { value: 'Backslash', text: '\\' },
  { value: 'Semicolon', text: ';' },
  { value: 'Quote', text: "'" },
  { value: 'Comma', text: ',' },
  { value: 'Period', text: '.' },
  { value: 'Slash', text: '/' },
  { value: 'Backquote', text: '`' },
  { value: 'F1', text: 'F1' },
  { value: 'F2', text: 'F2' },
  { value: 'F3', text: 'F3' },
  { value: 'F4', text: 'F4' },
  { value: 'F5', text: 'F5' },
  { value: 'F6', text: 'F6' },
  { value: 'F7', text: 'F7' },
  { value: 'F8', text: 'F8' },
  { value: 'F9', text: 'F9' },
  { value: 'F10', text: 'F10' },
  { value: 'F11', text: 'F11' },
  { value: 'F12', text: 'F12' },
];

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
  select: { marginBottom: '0.5rem' },
  cancelBtn: { marginTop: '0.5rem' },
});

interface Props {
  onCapture: (code: string) => void;
  onClose: () => void;
  allowEscape?: boolean;
  captureScroll?: boolean;
}

export default function KeyCaptureModal({
  onCapture,
  onClose,
  allowEscape,
  captureScroll,
}: Props) {
  React.useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      e.preventDefault();
      e.stopPropagation();
      if (e.code === 'Escape' && !allowEscape) {
        onClose();
        return;
      }
      onCapture(e.code);
    }
    function handleMouseDown(e: MouseEvent) {
      e.preventDefault();
      e.stopPropagation();
      if (e.button === 0) {
        onCapture('Click');
      } else if (e.button === 2) {
        onCapture('RightClick');
      }
    }
    function handleWheel(e: WheelEvent) {
      e.preventDefault();
      e.stopPropagation();
      onCapture('Scroll');
    }
    function handleContextMenu(e: Event) {
      e.preventDefault();
    }

    document.addEventListener('keydown', handleKeyDown, true);
    document.addEventListener('mousedown', handleMouseDown, true);
    document.addEventListener('contextmenu', handleContextMenu, true);
    if (captureScroll) {
      document.addEventListener('wheel', handleWheel, true);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
      document.removeEventListener('mousedown', handleMouseDown, true);
      document.removeEventListener('contextmenu', handleContextMenu, true);
      if (captureScroll) {
        document.removeEventListener('wheel', handleWheel, true);
      }
    };
  }, [onCapture, onClose, allowEscape, captureScroll]);

  function handleSelect(value: string) {
    if (value) {
      onCapture(value);
    }
  }

  return (
    <View style={styles.overlay}>
      <View
        style={styles.content}
        onMouseDown={(e: React.MouseEvent) => {
          e.stopPropagation();
        }}
      >
        <Text style={styles.title}>Press a key or mouse button</Text>
        {!allowEscape && <Text style={styles.sub}>Escape to cancel</Text>}
        <View style={styles.select}>
          <Select
            value=''
            options={KEY_OPTIONS}
            placeholder='Or select manually…'
            onChange={handleSelect}
          />
        </View>
        <View style={styles.cancelBtn}>
          <TextButton text='Cancel' onPress={onClose} />
        </View>
      </View>
    </View>
  );
}

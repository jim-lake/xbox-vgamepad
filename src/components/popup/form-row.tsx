import React from 'react';
import { StyleSheet, Text, View } from '@/components/base_components';
import type { StyleInput } from '@/components/base_components';

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: '0.5rem',
    paddingBottom: '0.5rem',
    borderBottomWidth: 1,
    borderBottomColor: 'var(--row-border)',
  },
  label: {
    width: '12rem',
    color: 'var(--text-muted)',
    fontSize: '1.4rem',
    marginRight: '0.8rem',
  },
});

interface Props {
  label: string;
  style?: StyleInput;
  children: React.ReactNode;
}

export default function FormRow({ label, style, children }: Props) {
  return (
    <View style={[styles.row, style]}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

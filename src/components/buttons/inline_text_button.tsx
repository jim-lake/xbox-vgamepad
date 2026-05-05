import React from 'react';
import { StyleSheet, Text, TouchableHighlight, View } from '../base_components';
import type { StyleInput } from '../base_components';

interface Props {
  style?: StyleInput;
  className?: string;
  children?: React.ReactNode;
  text?: string;
  href?: string;
  url?: string;
  onPress?: () => void | Promise<void>;
  target?: string;
  underlayColor?: string;
}
export default function InlineTextButton(props: Props) {
  const { children, text, onPress, underlayColor, ...other }: Props = props;
  return (
    <Text {...other}>
      {children ?? text}
      <TouchableHighlight
        style={StyleSheet.absoluteFill}
        onPress={onPress}
        underlayColor={underlayColor}
      >
        <View style={StyleSheet.absoluteFill} />
      </TouchableHighlight>
    </Text>
  );
}

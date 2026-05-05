import React from 'react';
import { StyleSheet, View, Text, TouchableHighlight } from '../base_components';
import type { StyleInput } from '../base_components';

import { styles, getButtonStyles } from './button_style';
import type { StyleProps } from './button_style';

interface Props extends StyleProps {
  style?: StyleInput;
  textStyle?: StyleInput;
  // type is inherited from StyleProps
  text: string;
  disabled?: boolean;
  onPress?: () => void | Promise<void>;
  underlayColor?: string;
  beforeText?: React.ReactNode;
  afterText?: React.ReactNode;
  isBusy?: boolean;
}
export default function TextButton(props: Props) {
  const {
    style,
    textStyle,
    text,
    disabled,
    onPress,
    underlayColor,
    beforeText,
    afterText,
  }: Props = props;
  const { button_extra, text_extra } = getButtonStyles(props);

  return (
    <View style={[styles.textButton, button_extra, style]}>
      <View style={styles.inner}>
        {beforeText}
        <Text style={[styles.text, text_extra, textStyle]}>{text}</Text>
        {afterText}
      </View>
      {disabled ? null : (
        <TouchableHighlight
          style={styles.highlight}
          underlayColor={underlayColor ?? 'rgba(0,0,0,0.2)'}
          onPress={onPress}
        >
          <View style={StyleSheet.absoluteFill} />
        </TouchableHighlight>
      )}
    </View>
  );
}

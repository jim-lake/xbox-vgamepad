import React from 'react';
import {
  Image,
  StyleSheet,
  TouchableHighlight,
  View,
} from '../base_components';
import type { StyleInput } from '../base_components';

const styles = StyleSheet.create({
  imageButton: {
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  image: { width: '100%', height: '100%' },
});

interface Props {
  style?: StyleInput;
  imageStyle?: StyleInput;
  source?: { uri: string } | string;
  children?: React.ReactNode;
  onPress: (event?: React.SyntheticEvent) => void | Promise<void>;
  resizeMode?: string;
  underlayColor?: string;
  title?: string;
}
export default function ImageButton(props: Props) {
  return (
    <View style={[styles.imageButton, props.style]} title={props.title}>
      {props.source ? (
        <Image
          style={[styles.image, props.imageStyle]}
          resizeMode={props.resizeMode ?? 'contain'}
          source={props.source}
        />
      ) : null}
      {props.children}
      <TouchableHighlight
        style={StyleSheet.absoluteFill}
        underlayColor={props.underlayColor ?? 'rgba(0,0,0,0.2)'}
        onPress={props.onPress}
      >
        <View style={StyleSheet.absoluteFill} />
      </TouchableHighlight>
    </View>
  );
}

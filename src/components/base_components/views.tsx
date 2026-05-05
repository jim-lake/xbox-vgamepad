import React from 'react';
import { resolveStyle, StyleSheet } from './styles';
import type { StyleInput } from './styles';

const styles = StyleSheet.create({
  scrollerStyle: {
    overflowX: 'hidden',
    overflowY: 'scroll',
    overflowScroll: 'contain',
  },
  scrollerStyleHorizontal: {
    overflowX: 'scroll',
    overflowY: 'hidden',
    overflowScroll: 'contain',
  },
  contentContainerStyle: { overflowX: 'auto', overflowY: 'auto' },
  pointerBoxNone: { pointerEvents: 'none' },
});

export interface ViewProps {
  style?: StyleInput;
  children?: React.ReactNode;
  className?: string;
  pointerEvents?: string;
  getDiv?: React.RefObject<HTMLDivElement | null>;
  [key: string]: unknown;
}
export function View({
  style,
  children,
  className: extraClass,
  pointerEvents,
  getDiv,
  ...other_props
}: ViewProps) {
  const computedStyle =
    pointerEvents === 'box-none' || pointerEvents === 'none'
      ? [style, styles.pointerBoxNone]
      : style;

  const { inlineStyle, className } = resolveStyle(computedStyle, extraClass);
  const extra_props = getDiv ? { ref: getDiv } : {};
  return (
    <div
      className={className}
      style={inlineStyle}
      {...other_props}
      {...extra_props}
    >
      {children}
    </div>
  );
}
export interface ScrollViewProps extends ViewProps {
  contentContainerStyle?: StyleInput;
  contentContainerProps?: ViewProps;
  horizontal?: boolean;
  onScroll?: (event: React.UIEvent<HTMLDivElement>) => void;
}
export function ScrollView({
  style,
  contentContainerStyle,
  horizontal,
  children,
  onScroll,
  contentContainerProps,
  ...other_props
}: ScrollViewProps) {
  const base_style = horizontal
    ? styles.scrollerStyleHorizontal
    : styles.scrollerStyle;

  return (
    <View style={[base_style, style]} onScroll={onScroll} {...other_props}>
      <View
        style={[styles.contentContainerStyle, contentContainerStyle]}
        {...(contentContainerProps ?? {})}
      >
        {children}
      </View>
    </View>
  );
}

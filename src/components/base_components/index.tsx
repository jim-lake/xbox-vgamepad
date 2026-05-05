import React from 'react';
import { resolveStyle, StyleSheet, css } from './styles';
import type { StyleInput } from './styles';
import { View, ScrollView } from './views';
import { KeyboardAvoidingView } from './keyboard_avoiding_view';
import { Keyboard } from './keyboard';
import { FlatList } from './flat_list';
import { Linking } from './linking';
import { Dimensions } from './dimensions';
import { ActivityIndicator } from './utils';

export {
  View,
  ScrollView,
  KeyboardAvoidingView,
  Keyboard,
  FlatList,
  Linking,
  Dimensions,
  ActivityIndicator,
  StyleSheet,
};
export type { StyleInput };

interface TouchableWithoutFeedbackProps {
  style?: StyleInput;
  className?: string;
  children?: React.ReactNode;
  onPress?: (event?: React.SyntheticEvent) => void | Promise<void>;
  [key: string]: unknown;
}

export function TouchableWithoutFeedback({
  style,
  className: extraClass,
  children,
  onPress,
  ...other_props
}: TouchableWithoutFeedbackProps) {
  const { className, inlineStyle } = resolveStyle(style, extraClass);

  function _onPress(event?: React.SyntheticEvent) {
    void onPress?.(event);
  }

  return (
    <div
      onClick={_onPress}
      className={`${className} touchable-without-feedback`}
      style={inlineStyle}
      {...other_props}
    >
      {children}
    </div>
  );
}

function noop() {
  // Empty function for touch events
}
const DEFAULT_DELAY = 500;

interface TouchableHighlightProps {
  style?: StyleInput;
  children?: React.ReactNode;
  underlayColor?: string | undefined;
  pointerEvents?: string;
  onPress?: (() => void | Promise<void>) | undefined;
  onLongPress?: (() => void | Promise<void>) | undefined;
  delay?: number;
  [key: string]: unknown;
}

export function TouchableHighlight({
  style,
  children,
  underlayColor = 'rgba(0,0,0,0.5)',
  onPress,
  onLongPress,
  delay,
  ...other_props
}: TouchableHighlightProps) {
  const timeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const sentLongPressRef = React.useRef(false);

  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const start = React.useCallback(() => {
    if (!timeoutRef.current && onLongPress) {
      timeoutRef.current = setTimeout(() => {
        sentLongPressRef.current = true;
        void onLongPress();
      }, delay ?? DEFAULT_DELAY);
    }
  }, [onLongPress, delay]);

  const clear = React.useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const handlePress = React.useCallback(() => {
    if (sentLongPressRef.current) {
      sentLongPressRef.current = false;
    } else {
      void onPress?.();
    }
  }, [onPress]);

  const { className, inlineStyle } = resolveStyle(style);
  const inner_style = { backgroundColor: underlayColor };
  const extra = onLongPress
    ? {
        onMouseDown: start,
        onTouchStart: start,
        onMouseUp: clear,
        onMouseLeave: clear,
        onTouchEnd: clear,
        onClick: handlePress,
      }
    : { onTouchStart: noop, onClick: onPress };

  return (
    <div
      className={`${className} touchable-highlight`}
      style={inlineStyle}
      {...extra}
      {...other_props}
    >
      <div className='touchable-highlight-underlay' style={inner_style} />
      {children}
    </div>
  );
}
interface TextProps {
  style?: StyleInput;
  className?: string;
  children?: React.ReactNode;
  pointerEvents?: string;
  [key: string]: unknown;
}

export function Text({
  style,
  className: extraClass,
  children,
  ...other_props
}: TextProps) {
  const { className, inlineStyle } = resolveStyle(style, extraClass);
  return (
    <div className={className} style={inlineStyle} {...other_props}>
      {children}
    </div>
  );
}
interface BaseInputProps {
  style?: StyleInput;
  className?: string;
  value?: string | number | boolean;
  type?: string;
  [key: string]: unknown;
}

export function BaseInput({
  style,
  className: extraClass,
  value,
  type,
  ...other_props
}: BaseInputProps) {
  const { className, inlineStyle } = resolveStyle(style, extraClass);
  const input_props: Record<string, unknown> = {
    className: `base-component-text-input ${className}`,
    style: inlineStyle,
    type,
    ...other_props,
  };
  if (type === 'checkbox') {
    input_props['checked'] = value;
    input_props['className'] = `${String(
      input_props['className']
    )} base-component-checkbox-input`;
  } else if (type === 'radio') {
    input_props['className'] = `${String(
      input_props['className']
    )} base-component-radio-input`;
  }

  return <input {...input_props} />;
}
interface TextInputProps {
  style?: StyleInput;
  className?: string;
  onSubmitEditing?: (e: React.SubmitEvent) => void | Promise<void>;
  secureTextEntry?: boolean;
  onChangeText?: (text: string) => void;
  multiline?: boolean;
  autoGrow?: boolean;
  autoCorrect?: boolean;
  keyboardType?: string;
  returnKeyType?: string;
  placeholderTextColor?: string;
  value?: string;
  rows?: number;
  [key: string]: unknown;
}

export function TextInput({
  style,
  className: extraClass,
  onSubmitEditing,
  secureTextEntry,
  onChangeText,
  multiline,
  autoGrow,
  autoCorrect,
  returnKeyType,
  placeholderTextColor,
  value,
  rows,
  ...other_props
}: TextInputProps) {
  function _onChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) {
    onChangeText?.(e.target.value);
  }
  const extra: Record<string, string> = {};

  if (secureTextEntry) {
    extra['type'] = 'password';
  }
  if (returnKeyType) {
    extra['enterKeyHint'] = returnKeyType;
  }
  if (autoCorrect) {
    extra['autoCorrect'] = 'on';
  }

  const { className: baseClassName, inlineStyle } = resolveStyle(
    style,
    extraClass
  );
  let className = baseClassName;
  if (other_props['type'] === 'checkbox') {
    className = `${className} base-component-checkbox-input`;
  }
  const input_props: Record<string, unknown> = {
    className: `base-component-text-input ${className}`,
    style: inlineStyle,
    onChange: _onChange,
    onInput: _onChange,
    value,
    ...other_props,
    ...extra,
  };

  const placeholderClass = React.useMemo(() => {
    let ret = '';
    if (placeholderTextColor) {
      const sheet = StyleSheet.create({
        input: { '::placeholder': placeholderTextColor },
      });
      ret = css(sheet.input);
    }
    return ret;
  }, [placeholderTextColor]);
  if (placeholderClass) {
    input_props['className'] = `${String(
      input_props['className']
    )} ${placeholderClass}`;
  }

  let input;
  if (multiline) {
    if (autoGrow) {
      input = (
        <div
          className={`base-component-text-input-autogrow ${className}`}
          style={inlineStyle}
        >
          <textarea
            className={
              'base-component-text-input-autogrow-textarea ' + placeholderClass
            }
            value={value}
            onChange={_onChange}
            rows={rows ?? 1}
            {...other_props}
            {...extra}
          />
          <div className='base-component-text-input-autogrow-after'>
            {(value ?? '') + ' '}
          </div>
        </div>
      );
    } else {
      input = <textarea {...input_props} rows={rows ?? 1} />;
    }
  } else {
    input = <input {...input_props} />;
  }

  function _onSubmitEditing(e: React.SubmitEvent) {
    e.preventDefault();
    void onSubmitEditing?.(e);
    return false;
  }
  let content;
  if (onSubmitEditing) {
    content = (
      <form
        className='base-component-text-input-form'
        onSubmit={_onSubmitEditing}
      >
        {input}
      </form>
    );
  } else {
    content = input;
  }
  return content;
}

interface ImageProps {
  style?: StyleInput;
  resizeMode?: string;
  source?: { src?: string; uri?: string } | string;
  getDiv?: React.Ref<HTMLDivElement>;
  className?: string;
  [key: string]: unknown;
}

export function Image({
  style,
  resizeMode = 'contain',
  source,
  getDiv,
  className: extraClass,
  ...other_props
}: ImageProps) {
  const { className, inlineStyle } = resolveStyle(style, extraClass);

  if (resizeMode === 'tile') {
    inlineStyle['backgroundRepeat'] = 'repeat';
  } else {
    inlineStyle['backgroundSize'] = resizeMode;
    inlineStyle['backgroundRepeat'] = 'no-repeat';
    inlineStyle['backgroundPosition'] = 'center center';
  }
  const uri =
    (source && typeof source === 'object'
      ? (source.src ?? source.uri)
      : source) ?? '';
  inlineStyle['backgroundImage'] = `url("${uri}")`;
  const extra_props: { ref?: React.Ref<HTMLDivElement> } = {};
  if (getDiv) {
    extra_props.ref = getDiv;
  }
  return (
    <div
      className={className}
      style={inlineStyle}
      {...extra_props}
      {...other_props}
    />
  );
}

export function StatusBar() {
  // StatusBar is a no-op on web
  return null;
}

StatusBar.setBarStyle = function () {
  // No-op on web
};
StatusBar.setBackgroundColor = function () {
  // No-op on web
};

export default {
  View,
  ScrollView,
  KeyboardAvoidingView,
  Keyboard,
  FlatList,
  Linking,
  Dimensions,
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  BaseInput,
  Image,
  TouchableHighlight,
  TouchableWithoutFeedback,
  StatusBar,
};

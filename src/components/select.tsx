import React from 'react';
import { StyleSheet, View } from './base_components';
import { resolveStyle } from './base_components/styles';
import type { StyleInput } from './base_components';

interface SelectOption {
  value: string | number;
  text: string;
  disabled?: boolean;
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: 'var(--input-bg)',
    borderWidth: 1,
    borderRadius: 6,
    paddingRight: '0.5rem',
  },
  select: {
    padding: '0.4rem 0.5rem 0.4rem 0.5rem',
    color: 'var(--text-primary)',
    fontSize: '1.4rem',
    appearance: 'auto',
    borderWidth: 0,
    backgroundColor: 'transparent',
  },
});

export interface Props {
  style?: StyleInput;
  value: string;
  options: (string | SelectOption)[];
  placeholder?: string;
  className?: string;
  onChange: (value: string) => void;
  children?: React.ReactNode;
}
export default function Select(props: Props) {
  const {
    style,
    value,
    options,
    placeholder,
    className: extraClass,
    onChange,
    children,
    ...other_props
  } = props;
  function _onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    onChange(e.target.value);
  }

  const extra: Record<string, boolean> = {};
  const opts = options.map(_mapOpt);
  if (placeholder && !value) {
    const def = (
      <option key='default' disabled hidden value=''>
        {placeholder}
      </option>
    );
    opts.unshift(def);
    extra['required'] = true;
  }

  const { className, inlineStyle } = resolveStyle(
    [styles.select, style],
    extraClass
  );
  return (
    <View style={styles.wrapper}>
      <select
        className={'base-component-text-input ' + className}
        style={inlineStyle}
        {...extra}
        {...other_props}
        value={value}
        onChange={_onChange}
      >
        {opts}
        {children}
      </select>
    </View>
  );
}
function _mapOpt(opt: string | SelectOption, i: number) {
  let ret;
  if (typeof opt === 'string') {
    ret = (
      <option key={i} value={opt}>
        {opt}
      </option>
    );
  } else {
    ret = (
      <option
        key={i}
        value={String(opt.value)}
        {...(opt.disabled ? { disabled: true } : {})}
      >
        {opt.text}
      </option>
    );
  }
  return ret;
}

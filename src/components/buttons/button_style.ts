import { StyleSheet } from '../base_components';

import '../../css/colors.css';

export const styles = StyleSheet.create({
  textButton: {
    height: '3.2rem',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'var(--button-bg)',
    borderRadius: '1rem',
    borderWidth: 1,
    overflow: 'visible',
  },
  inner: {
    paddingLeft: '1.5rem',
    paddingRight: '1.5rem',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  highlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: '1rem',
    overflow: 'hidden',
  },
  text: { color: 'var(--button-text)', fontSize: '1.4rem', fontWeight: '600' },
  defaultButton: {
    backgroundColor: 'var(--button-default-bg)',
    borderColor: 'var(--button-default-border)',
  },
  defaultText: { color: 'var(--button-default-text)' },
  disabledButton: {
    backgroundColor: 'var(--button-disabled-bg)',
    borderColor: 'var(--button-disabled-border)',
  },
  disabledText: { color: 'var(--button-disabled-text)' },
  dangerButton: {
    backgroundColor: 'var(--button-danger-bg)',
    borderColor: 'var(--button-danger-border)',
  },
  dangerText: { color: 'var(--button-danger-text)' },
  ghostInvertedButton: {
    borderColor: 'var(--button-ghost-inverted-border)',
    backgroundColor: 'var(--button-ghost-inverted-bg)',
  },
  ghostInvertedText: { color: 'var(--button-ghost-inverted-text)' },
  ghostButton: {
    borderColor: 'var(--button-ghost-border)',
    backgroundColor: 'var(--button-ghost-bg)',
  },
  ghostText: { color: 'var(--button-ghost-text)' },
  invertedButton: {
    backgroundColor: 'var(--button-inverted-bg)',
    borderColor: 'var(--button-inverted-border)',
  },
  invertedText: { color: 'var(--button-inverted-text)' },
  emptyButton: {
    backgroundColor: 'var(--button-empty-bg)',
    borderColor: 'var(--button-empty-border)',
  },
  emptyText: { color: 'var(--button-empty-text)' },
  blueButton: {
    backgroundColor: 'var(--button-blue-bg)',
    borderColor: 'var(--button-blue-border)',
  },
  blueText: { color: 'var(--button-blue-text)' },
});

export interface StyleProps {
  disabled?: boolean;
  type?:
    | 'ghost'
    | 'ghost-inverted'
    | 'empty'
    | 'inverted'
    | 'danger'
    | 'blue'
    | 'default';
}
export function getButtonStyles(props: StyleProps) {
  const { disabled, type } = props;
  let button_extra = styles.defaultButton;
  let text_extra = styles.defaultText;
  if (disabled) {
    button_extra = styles.disabledButton;
    text_extra = styles.disabledText;
  } else if (type === 'ghost') {
    button_extra = styles.ghostButton;
    text_extra = styles.ghostText;
  } else if (type === 'ghost-inverted') {
    button_extra = styles.ghostInvertedButton;
    text_extra = styles.ghostInvertedText;
  } else if (type === 'empty') {
    button_extra = styles.emptyButton;
    text_extra = styles.emptyText;
  } else if (type === 'inverted') {
    button_extra = styles.invertedButton;
    text_extra = styles.invertedText;
  } else if (type === 'danger') {
    button_extra = styles.dangerButton;
    text_extra = styles.dangerText;
  } else if (type === 'blue') {
    button_extra = styles.blueButton;
    text_extra = styles.blueText;
  }
  return { button_extra, text_extra };
}

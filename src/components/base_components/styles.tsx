import * as Aphrodite from 'aphrodite/no-important';

import '../../css/base_components.css';

type StyleObject = Record<
  string,
  string | number | Record<string, string | number>
>;
interface AphroditeStyle {
  _name: string;
  _definition: StyleObject;
}
export type StyleInput =
  | AphroditeStyle
  | StyleObject
  | (AphroditeStyle | StyleObject | null | undefined)[]
  | null
  | undefined
  | StyleInput[];

export function css(...args: AphroditeStyle[]) {
  return Aphrodite.css(...args);
}

export function resolveStyle(style: StyleInput, extra_class?: string) {
  let className = 'base-component ';
  const inlineStyle: StyleObject = {};
  const aphrodite_style_list: AphroditeStyle[] = [];

  function _handleStyle(sub_style: StyleInput) {
    if (sub_style && typeof sub_style === 'object' && '_name' in sub_style) {
      aphrodite_style_list.push(sub_style as AphroditeStyle);
    } else if (Array.isArray(sub_style)) {
      sub_style.forEach(_handleStyle);
    } else if (
      typeof sub_style === 'object' &&
      sub_style &&
      !Array.isArray(sub_style) &&
      !('_name' in sub_style)
    ) {
      Object.assign(inlineStyle, sub_style);
    }
  }
  _handleStyle(style);
  if (aphrodite_style_list.length > 0) {
    className += css(...aphrodite_style_list);
  }
  if (extra_class) {
    className += ' ' + extra_class;
  }
  return { className, inlineStyle };
}

function _createStyleSheet<T extends Record<string, StyleObject>>(
  style_map: T
): Record<keyof T, AphroditeStyle> {
  return Aphrodite.StyleSheet.create(style_map) as Record<
    keyof T,
    AphroditeStyle
  >;
}

const styles = _createStyleSheet({
  absoluteFill: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
});

export const StyleSheet = {
  create: _createStyleSheet,
  absoluteFill: styles.absoluteFill,
  absoluteFillObject: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  hairlineWidth:
    1 / (typeof window !== 'undefined' ? window.devicePixelRatio : 1),
};
export default { StyleSheet };

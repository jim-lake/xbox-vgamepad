type CssPropertyName =
  | 'align-items'
  | 'background'
  | 'border-radius'
  | 'bottom'
  | 'color'
  | 'cursor'
  | 'display'
  | 'font-size'
  | 'font-weight'
  | 'height'
  | 'justify-content'
  | 'left'
  | 'opacity'
  | 'padding'
  | 'pointer-events'
  | 'position'
  | 'right'
  | 'top'
  | 'transform'
  | 'transition'
  | 'user-select'
  | 'width'
  | 'z-index';

export type CssStyles = Partial<Record<CssPropertyName, string | number>>;

export function cssToString(styles: CssStyles): string {
  return Object.entries(styles)
    .map(([k, v]) => `${k}:${String(v)}`)
    .join(';');
}

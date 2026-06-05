import { resolveStyle } from './base_components/styles';
import type { StyleInput } from './base_components';

export interface Props {
  style?: StyleInput;
  className?: string;
  min: number;
  max: number;
  value: number;
  onChange: (value: number) => void;
  onMouseDown?: (e: React.MouseEvent<HTMLInputElement>) => void;
  onMouseUp?: (e: React.MouseEvent<HTMLInputElement>) => void;
  onTouchStart?: (e: React.TouchEvent<HTMLInputElement>) => void;
  onTouchEnd?: (e: React.TouchEvent<HTMLInputElement>) => void;
}

export default function Range({
  style,
  className: extraClass,
  min,
  max,
  value,
  onChange,
  ...other_props
}: Props) {
  const { className, inlineStyle } = resolveStyle(style, extraClass);
  return (
    <input
      type='range'
      className={'range-styled ' + className}
      style={inlineStyle}
      min={min}
      max={max}
      value={value}
      onChange={(e) => {
        onChange(Number(e.target.value));
      }}
      {...other_props}
    />
  );
}

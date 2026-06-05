import { useEffect, useRef } from 'react';
import { useLatestCallback } from '@/tools/latest_callback';
import { StyleSheet } from './base_components';
import { resolveStyle } from './base_components/styles';

import type { StyleInput } from './base_components';

const styles = StyleSheet.create({
  xyPad: {
    position: 'relative',
    border: '1px solid #888',
    touchAction: 'none',
    userSelect: 'none',
  },
  handle: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: '50%',
    background: 'black',
    transform: 'translate(-50%, -50%)',
    pointerEvents: 'none',
  },
});

export type Snaps = 4 | 8;

export interface XY {
  x: number;
  y: number;
}
export interface XYPadProps {
  style?: StyleInput;
  handleStyle?: StyleInput;
  snaps?: Snaps;
  value: XY;
  onChange?: (pos: Readonly<XY>) => void | Promise<void>;
  onDragDone?: (pos: Readonly<XY>) => void;
}
export default function XYPad(props: XYPadProps) {
  const padRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<HTMLDivElement>(null);
  const valueRef = useRef<XY>(props.value);
  const frameRef = useRef<number | null>(null);

  const _positionHandle = useLatestCallback(() => {
    const pad = padRef.current;
    const handle = handleRef.current;
    if (!pad || !handle) {
      return;
    }
    const { x, y } = valueRef.current;
    handle.style.left = `${((x + 1) / 2) * 100}%`;
    handle.style.top = `${((1 - y) / 2) * 100}%`;
  });

  // Sync incoming controlled value → ref + DOM, but skip if a drag
  // frame is already pending (the drag's rAF will win and call onChange,
  // which will round-trip back here on the next render).
  useEffect(() => {
    if (frameRef.current !== null) {
      return;
    }
    valueRef.current = { x: props.value.x, y: props.value.y };
    _positionHandle();
  }, [props.value.x, props.value.y, _positionHandle]);

  useEffect(() => {
    _positionHandle();
    return () => {
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
      }
    };
  }, [_positionHandle]);

  const _scheduleUpdate = useLatestCallback(() => {
    if (frameRef.current !== null) {
      return;
    }
    frameRef.current = window.requestAnimationFrame(() => {
      frameRef.current = null;
      const next = { ...valueRef.current };
      void props.onChange?.(next);
    });
  });

  const _update = useLatestCallback((clientX: number, clientY: number) => {
    const pad = padRef.current;
    if (!pad) {
      return;
    }
    const rect = pad.getBoundingClientRect();
    const px = Math.max(0, Math.min(rect.width, clientX - rect.left));
    const py = Math.max(0, Math.min(rect.height, clientY - rect.top));
    let x = (px / rect.width) * 2 - 1;
    let y = 1 - (py / rect.height) * 2;

    if (props.snaps) {
      ({ x, y } = _applySnap(x, y, props.snaps));
    }

    valueRef.current = {
      x: (px / rect.width) * 2 - 1,
      y: 1 - (py / rect.height) * 2,
    };
    _positionHandle();
    _scheduleUpdate();
  });

  const _onPointerDown = useLatestCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      e.currentTarget.setPointerCapture(e.pointerId);
      _update(e.clientX, e.clientY);
    }
  );

  const _onPointerMove = useLatestCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!e.currentTarget.hasPointerCapture(e.pointerId)) {
        return;
      }
      _update(e.clientX, e.clientY);
    }
  );
  const _onPointerUp = useLatestCallback(() => {
    props.onDragDone?.({ ...valueRef.current });
  });

  const xyPadResolved = resolveStyle([styles.xyPad, props.style]);
  const handleResolved = resolveStyle([styles.handle, props.handleStyle]);
  return (
    <div
      ref={padRef}
      style={xyPadResolved.inlineStyle}
      className={xyPadResolved.className}
      onPointerDown={_onPointerDown}
      onPointerMove={_onPointerMove}
      onPointerUp={_onPointerUp}
    >
      <div
        ref={handleRef}
        style={handleResolved.inlineStyle}
        className={handleResolved.className}
      />
    </div>
  );
}
function _applySnap(x: number, y: number, snaps: Snaps): XY {
  const len = Math.sqrt(x * x + y * y);
  if (len === 0) {
    return { x: 0, y: 0 };
  }
  const angle = Math.atan2(y, x);
  const step = (Math.PI * 2) / snaps;
  const snappedAngle = Math.round(angle / step) * step;
  return { x: Math.cos(snappedAngle) * len, y: Math.sin(snappedAngle) * len };
}

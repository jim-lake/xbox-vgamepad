export type AM = { angle: number; magnitude: number };

export type XY = { x: number; y: number };

export function calcSweepMag(pos: XY): AM {
  return {
    angle: Math.atan2(pos.y, pos.x),
    magnitude: Math.max(Math.abs(pos.x), Math.abs(pos.y)),
  };
}
const TAU = Math.PI * 2;

/**
 * @param t - Interpolation factor in [0, 1], where 0 returns start and 1 returns end
 */
export function calcSweepPos(
  start: AM,
  end: AM,
  clockwise: boolean,
  t: number
): XY {
  let delta = end.angle - start.angle;
  if (clockwise && delta > 0) {
    delta -= TAU;
  } else if (!clockwise && delta < 0) {
    delta += TAU;
  }
  const angle = start.angle + delta * t;
  const mag = start.magnitude + (end.magnitude - start.magnitude) * t;
  let x = Math.cos(angle);
  let y = Math.sin(angle);
  const s = 1 / Math.max(Math.abs(x), Math.abs(y));
  x *= s;
  y *= s;
  return { x: x * mag, y: y * mag };
}

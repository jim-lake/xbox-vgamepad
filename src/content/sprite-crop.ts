/**
 * Stateless sprite cropping with background removal.
 * Pure pixel operations on passed-in buffers.
 */

/**
 * Flood-fills from edges to find exterior (background) pixels.
 * Returns a mask where 1 = exterior (transparent), 0 = interior (keep).
 */
export function buildExteriorMask(
  binary: Uint8Array,
  frameW: number,
  cx: number,
  cy: number,
  cw: number,
  ch: number
): Uint8Array {
  const exterior = new Uint8Array(cw * ch);
  const floodStack: number[] = [];

  // Seed edges
  for (let px = 0; px < cw; px++) {
    if (binary[cy * frameW + (cx + px)] === 0) {
      floodStack.push(px);
    }
    if (binary[(cy + ch - 1) * frameW + (cx + px)] === 0) {
      floodStack.push((ch - 1) * cw + px);
    }
  }
  for (let py = 1; py < ch - 1; py++) {
    if (binary[(cy + py) * frameW + cx] === 0) {
      floodStack.push(py * cw);
    }
    if (binary[(cy + py) * frameW + (cx + cw - 1)] === 0) {
      floodStack.push(py * cw + cw - 1);
    }
  }

  for (const idx of floodStack) {
    exterior[idx] = 1;
  }

  while (floodStack.length > 0) {
    const idx = floodStack.pop();
    if (idx === undefined) {
      break;
    }
    const px = idx % cw;
    const py = (idx - px) / cw;
    const neighbors = [
      py > 0 ? idx - cw : -1,
      py < ch - 1 ? idx + cw : -1,
      px > 0 ? idx - 1 : -1,
      px < cw - 1 ? idx + 1 : -1,
    ];
    for (const n of neighbors) {
      if (n >= 0 && exterior[n] === 0) {
        const nx = n % cw;
        const ny = (n - nx) / cw;
        if (binary[(cy + ny) * frameW + (cx + nx)] === 0) {
          exterior[n] = 1;
          floodStack.push(n);
        }
      }
    }
  }

  return exterior;
}

/**
 * Applies exterior mask — returns raw RGBA buffer. No DOM dependency.
 */
export function applyCropMaskRaw(
  srcData: Uint8ClampedArray,
  srcW: number,
  exterior: Uint8Array,
  cx: number,
  cy: number,
  cw: number,
  ch: number
): Uint8ClampedArray {
  const out = new Uint8ClampedArray(cw * ch * 4);
  for (let py = 0; py < ch; py++) {
    for (let px = 0; px < cw; px++) {
      const srcIdx = ((cy + py) * srcW + (cx + px)) * 4;
      const dstIdx = (py * cw + px) * 4;
      out[dstIdx] = srcData[srcIdx] ?? 0;
      out[dstIdx + 1] = srcData[srcIdx + 1] ?? 0;
      out[dstIdx + 2] = srcData[srcIdx + 2] ?? 0;
      out[dstIdx + 3] = exterior[py * cw + px] !== 0 ? 0 : 255;
    }
  }
  return out;
}

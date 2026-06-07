/**
 * Pure TypeScript image operations replacing OpenCV.
 * No eval/Function usage — safe for Chrome MV3 extension CSP.
 */

export function rgbaToGray(
  data: Uint8ClampedArray,
  width: number,
  height: number
): Uint8Array {
  const len = width * height;
  const out = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    const off = i * 4;
    // SAFETY: off+2 is always in bounds since len = width*height and data has 4*len elements
    out[i] = Math.round(
      0.299 * (data[off] ?? 0) +
        0.587 * (data[off + 1] ?? 0) +
        0.114 * (data[off + 2] ?? 0)
    );
  }
  return out;
}

export function absdiff(a: Uint8Array, b: Uint8Array): Uint8Array {
  const out = new Uint8Array(a.length);
  for (let i = 0; i < a.length; i++) {
    out[i] = Math.abs((a[i] ?? 0) - (b[i] ?? 0));
  }
  return out;
}

export function threshold(src: Uint8Array, thresh: number): Uint8Array {
  const out = new Uint8Array(src.length);
  for (let i = 0; i < src.length; i++) {
    out[i] = (src[i] ?? 0) > thresh ? 255 : 0;
  }
  return out;
}

/**
 * Find bounding rects of connected white regions via flood fill.
 * Returns bounding boxes directly (we only ever need boundingRect).
 */
export function findBoundingRects(
  binary: Uint8Array,
  width: number,
  height: number
): Array<{ x: number; y: number; w: number; h: number }> {
  const visited = new Uint8Array(binary.length);
  const rects: Array<{ x: number; y: number; w: number; h: number }> = [];

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      if (binary[idx] === 0 || visited[idx]) {
        continue;
      }
      // BFS flood fill to find connected component bounds
      let minX = x;
      let maxX = x;
      let minY = y;
      let maxY = y;
      const stack = [idx];
      visited[idx] = 1;

      while (stack.length > 0) {
        const cur = stack.pop() as number;
        const cx = cur % width;
        const cy = (cur - cx) / width;
        if (cx < minX) {
          minX = cx;
        }
        if (cx > maxX) {
          maxX = cx;
        }
        if (cy < minY) {
          minY = cy;
        }
        if (cy > maxY) {
          maxY = cy;
        }

        // 4-connected neighbors
        const neighbors = [
          cy > 0 ? cur - width : -1,
          cy < height - 1 ? cur + width : -1,
          cx > 0 ? cur - 1 : -1,
          cx < width - 1 ? cur + 1 : -1,
        ];
        for (const n of neighbors) {
          if (n >= 0 && !visited[n] && binary[n] !== 0) {
            visited[n] = 1;
            stack.push(n);
          }
        }
      }

      rects.push({ x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 });
    }
  }

  return rects;
}

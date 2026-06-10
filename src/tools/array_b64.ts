export function uint8ArrayToB64(bytes: Uint8Array): string {
  let binary = '';
  for (const b of bytes) {
    binary += String.fromCharCode(b);
  }
  return btoa(binary);
}

export function b64ToUint8Array(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export function arrayBufferToB64(buf: ArrayBuffer): string {
  return uint8ArrayToB64(new Uint8Array(buf));
}

export function b64ToArrayBuffer(b64: string): ArrayBuffer {
  return b64ToUint8Array(b64).buffer as ArrayBuffer;
}

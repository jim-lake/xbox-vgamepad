interface SpriteRecord {
  game: string;
  spriteType: string;
  buffer: ArrayBuffer;
  w: number;
  h: number;
  updatedAt: number;
}

const DB_NAME = 'xvg-sprites';
const STORE_NAME = 'sprites';
const DB_VERSION = 1;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => {
      resolve(req.result);
    };
    req.onerror = () => {
      reject(new Error('Failed to open sprite DB'));
    };
  });
}

function base64ToArrayBuffer(b64: string): ArrayBuffer {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

function arrayBufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = '';
  for (const b of bytes) {
    binary += String.fromCharCode(b);
  }
  return btoa(binary);
}

export async function saveSprite(
  game: string,
  spriteType: string,
  buffer: string,
  w: number,
  h: number
): Promise<void> {
  const db = await openDB();
  const record: SpriteRecord = {
    game,
    spriteType,
    buffer: base64ToArrayBuffer(buffer),
    w,
    h,
    updatedAt: Date.now(),
  };
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(record, `${game}::${spriteType}`);
    tx.oncomplete = () => {
      resolve();
    };
    tx.onerror = () => {
      reject(new Error('Failed to save sprite'));
    };
  });
}

export async function loadSprites(
  game: string
): Promise<
  Array<{ spriteType: string; buffer: string; w: number; h: number }>
> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.getAll();
    req.onsuccess = () => {
      const all = req.result as SpriteRecord[];
      resolve(
        all
          .filter((r) => r.game === game)
          .map((r) => ({
            spriteType: r.spriteType,
            buffer: arrayBufferToBase64(r.buffer),
            w: r.w,
            h: r.h,
          }))
      );
    };
    req.onerror = () => {
      reject(new Error('Failed to load sprites'));
    };
  });
}

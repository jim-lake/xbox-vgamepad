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

export async function saveSprite(
  game: string,
  spriteType: string,
  buffer: ArrayBuffer,
  w: number,
  h: number
): Promise<void> {
  const db = await openDB();
  const record: SpriteRecord = {
    game,
    spriteType,
    buffer,
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
  Array<{ spriteType: string; buffer: ArrayBuffer; w: number; h: number }>
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
            buffer: r.buffer,
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

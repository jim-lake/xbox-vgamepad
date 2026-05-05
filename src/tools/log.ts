export default { setDebugLogger, log, errorLog, errorQuietLog, debugLog };

export type Logger = (...args: unknown[]) => void;
let g_logger: Logger | null = null;
export function setDebugLogger(logger: Logger) {
  g_logger = logger;
}
export function log(...args: unknown[]) {
  // eslint-disable-next-line no-console
  console.log(...args);
}
export function errorLog(...args: unknown[]) {
  // eslint-disable-next-line no-console
  console.log(...args);
  if (g_logger) {
    g_logger(...args);
  }
}
export function errorQuietLog(...args: unknown[]) {
  // eslint-disable-next-line no-console
  console.log(...args);
  if (g_logger) {
    g_logger(...args);
  }
}
export function debugLog(...args: unknown[]) {
  // eslint-disable-next-line no-console
  console.log(...args);
  if (g_logger) {
    g_logger(...args);
  }
}

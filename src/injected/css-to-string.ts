export function cssToString(styles: Record<string, string | number>): string {
  return Object.entries(styles)
    .map(
      ([k, v]) => `${k.replace(/([A-Z])/g, '-$1').toLowerCase()}:${String(v)}`
    )
    .join(';');
}

export function detectGame(): boolean {
  if (!location.hostname.includes('xbox.com')) {
    return true;
  }
  const h1 = document.querySelector('h1');
  const closeBtn = document.querySelector("[data-id='ui-container'] [aria-label='Close']");
  const streamDiv = document.getElementById('game-stream');
  return !h1 && !closeBtn && !!streamDiv;
}

export function getGameName(): string | null {
  const parts = document.title.split(/\s+\|/);
  if (parts.length === 2) {
    return parts[0]?.trim() ?? null;
  }
  return null;
}

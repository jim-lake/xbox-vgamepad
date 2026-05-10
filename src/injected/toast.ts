import { cssToString } from './css-to-string';

let toastEl: HTMLDivElement | null = null;
let toastTimer: ReturnType<typeof setTimeout> | null = null;

export function showToast(message: string): void {
  if (!toastEl) {
    toastEl = document.createElement('div');
    toastEl.id = 'xvg-toast';
    toastEl.style.cssText = cssToString({
      position: 'fixed',
      top: '20px',
      left: '50%',
      transform: 'translateX(-50%)',
      background: 'rgba(0,0,0,0.85)',
      color: '#fff',
      padding: '12px 24px',
      'border-radius': '8px',
      'font-size': '14px',
      'z-index': '2147483647',
      opacity: '0',
      transition: 'opacity 0.5s',
      'pointer-events': 'none',
    });
    document.body.appendChild(toastEl);
  }
  toastEl.textContent = message;
  toastEl.style.opacity = '1';
  if (toastTimer !== null) {
    clearTimeout(toastTimer);
  }
  toastTimer = setTimeout(() => {
    if (toastEl) {
      toastEl.style.opacity = '0';
    }
    toastTimer = null;
  }, 3000);
}

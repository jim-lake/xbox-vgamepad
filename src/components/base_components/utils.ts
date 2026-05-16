export { css, resolveStyle, StyleSheet } from './styles';
export { useWindowDimensions } from './dimensions';

import { css, resolveStyle, StyleSheet } from './styles';
import { useWindowDimensions } from './dimensions';

export const PixelRatio = { get: () => window.devicePixelRatio || 1 };

interface AlertButton {
  text?: string;
  onPress?: () => void;
  confirm?: boolean;
}

function alert(title: string, message?: string, buttons?: AlertButton[]) {
  const confirm_button = buttons?.find((b) => b.confirm) ?? buttons?.[0];
  const other_button =
    buttons?.[0] === confirm_button ? buttons?.[1] : buttons?.[0];
  if (confirm_button && other_button) {
    const result = window.confirm(message ?? title);
    if (result) {
      confirm_button.onPress?.();
    } else {
      other_button.onPress?.();
    }
  } else {
    window.alert(message ?? title);
    buttons?.[0]?.onPress?.();
  }
}

interface ShareContent {
  message: string;
  url: string;
  title: string;
}

interface ShareResult {
  action?: string;
  activityType?: string | null;
}

function share(content: ShareContent): Promise<ShareResult> {
  const { message, url, title } = content;
  return new Promise((resolve, reject) => {
    try {
      const opts = { url, title, text: message };
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if ('share' in navigator && navigator.share) {
        void navigator.share(opts).then(
          (result) => {
            resolve((result as ShareResult | undefined) ?? {});
          },
          (err: unknown) => {
            if (
              err &&
              typeof err === 'object' &&
              'name' in err &&
              err.name === 'AbortError'
            ) {
              resolve({ action: 'dismissedAction', activityType: null });
            } else {
              reject(
                new Error(err instanceof Error ? err.message : 'Share failed')
              );
            }
          }
        );
      } else {
        resolve({});
      }
    } catch (e) {
      reject(new Error(e instanceof Error ? e.message : 'Share failed'));
    }
  });
}

export const Alert = { alert };
export const Share = {
  share,
  disabled: typeof navigator === 'undefined' || !navigator.share,
};

export function ActivityIndicator() {
  return null;
}

export function Animated() {
  // No-op placeholder for Animated API
}

export const AppState = false;
export const Easing = false;

export function rem(amount: number): number {
  return amount;
}

export default {
  css,
  resolveStyle,
  StyleSheet,
  useWindowDimensions,
  PixelRatio,
  Alert,
  Share,
  ActivityIndicator,
  Animated,
  AppState,
  Easing,
  rem,
};

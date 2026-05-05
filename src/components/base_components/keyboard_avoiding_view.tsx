import React from 'react';
import { View } from './views';
import type { StyleInput } from './styles';

interface KeyboardAvoidingViewProps {
  behavior?: 'position' | 'padding' | 'height';
  style?: StyleInput;
  children: React.ReactNode;
}

export function KeyboardAvoidingView(props: KeyboardAvoidingViewProps) {
  const { inner_height, viewport_height } = React.useSyncExternalStore(
    _subscribe,
    _getHeights
  );
  let extra: { bottom?: number } | undefined;
  if (props.behavior === 'position') {
    const bottom = (inner_height ?? 0) - (viewport_height ?? 0);
    extra = { bottom };
  }
  return <View style={[props.style, extra]}>{props.children}</View>;
}

function _subscribe(callback: () => void) {
  if (typeof window !== 'undefined') {
    window.addEventListener('resize', callback);
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', callback);
    }
  }
  return () => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('resize', callback);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', callback);
      }
    }
  };
}

interface Heights {
  screen_height: number | undefined;
  inner_height: number | undefined;
  viewport_height: number | undefined;
}

let g_heights: Heights | undefined;
function _getHeights(): Heights {
  const new_heights: Heights = {
    screen_height:
      typeof window !== 'undefined' ? window.screen.height : undefined,
    inner_height:
      typeof window !== 'undefined' ? window.innerHeight : undefined,
    viewport_height:
      typeof window !== 'undefined' && window.visualViewport
        ? window.visualViewport.height
        : undefined,
  };
  if (
    !g_heights ||
    g_heights.screen_height !== new_heights.screen_height ||
    g_heights.inner_height !== new_heights.inner_height ||
    g_heights.viewport_height !== new_heights.viewport_height
  ) {
    g_heights = new_heights;
  }
  return g_heights;
}

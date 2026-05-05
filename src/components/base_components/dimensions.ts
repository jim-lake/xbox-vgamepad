import React from 'react';
import { EventEmitter } from 'events';

export default { get, useWindowDimensions };
export const Dimensions = { get };
export function useWindowDimensions() {
  return React.useSyncExternalStore(_subscribe, get);
}

interface Dimension {
  width: number;
  height: number;
}

const g_eventEmitter = new EventEmitter();
const CHANGE_EVENT = 'change';
function _emit(eventType: string) {
  g_eventEmitter.emit(CHANGE_EVENT, eventType);
}

let g_dimensions: Dimension | null = null;
let g_resizeSet = false;
export function get(): Dimension {
  if (!g_resizeSet) {
    g_resizeSet = true;
    window.addEventListener('resize', _onResize);
  }
  g_dimensions ??= { width: window.innerWidth, height: window.innerHeight };
  return g_dimensions;
}
function _onResize() {
  g_dimensions = null;
  _emit('resize');
}
function _subscribe(callback: (eventType: string) => void) {
  g_eventEmitter.on(CHANGE_EVENT, callback);
  return () => {
    g_eventEmitter.removeListener(CHANGE_EVENT, callback);
  };
}

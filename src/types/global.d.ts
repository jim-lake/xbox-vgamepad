declare global {
  interface Window {
    __VERSION__: string | undefined;
  }
  const __PACKAGE_VERSION__: string | undefined;
}

export {};

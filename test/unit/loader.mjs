// Loader hook: intercept storage and messaging imports and return empty stubs
export async function resolve(specifier, context, nextResolve) {
  if (
    specifier.includes('popup/storage') ||
    specifier.includes('popup/messaging')
  ) {
    return { shortCircuit: true, url: new URL(`stub:${specifier}`).href };
  }
  return nextResolve(specifier, context);
}

export async function load(url, context, nextLoad) {
  if (url.startsWith('stub:')) {
    return {
      shortCircuit: true,
      format: 'module',
      source: 'export default {}',
    };
  }
  return nextLoad(url, context);
}

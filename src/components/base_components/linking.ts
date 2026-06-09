export const Linking = { openURL, getInitialURL, addEventListener };
export default Linking;

function openURL(url: string) {
  window.open(url, '_blank');
}

function getInitialURL() {
  return Promise.resolve(window.location.href);
}
type EventHandler = (url: string) => void;

function addEventListener(_ignore: string, handler: EventHandler) {
  function _eventHandler() {
    const url = window.location.href;
    if (url) {
      handler(url);
    }
  };
  window.addEventListener('hashchange', _eventHandler);
  return {
    remove: () => {
      window.removeEventListener('hashchange', _eventHandler);
    },
  };
}

console.log('xbox-vgamepad background service worker loaded');

chrome.runtime.onInstalled.addListener(() => {
  console.log('xbox-vgamepad extension installed');
});

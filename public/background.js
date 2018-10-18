
chrome.runtime.onConnect.addListener(port => {
  // noop
}); //accept connection

chrome.contextMenus.create({
  id: 'openModal_' + chrome.runtime.id,
  title: chrome.i18n.getMessage('ctxMenu'),
  contexts: ['editable']
});

const currentlyRunningIn = [];

chrome.tabs.onUpdated.addListener(tabId => {
  const idx = currentlyRunningIn.indexOf(tabId);
  if (idx > -1) currentlyRunningIn.splice(idx, 1);
});

const injectScripts = (tabId, callback) => {
  if (!currentlyRunningIn.includes(tabId)) {
    // bleugh
    chrome.tabs.executeScript(tabId, {file: "rangy-core.js", allFrames: true}, () => {
      chrome.tabs.executeScript(tabId, {file: "rangy-selectionsaverestore.js", allFrames: true}, () => {
        chrome.tabs.executeScript(tabId, {file: "content.js", allFrames: true}, () => {
          currentlyRunningIn.push(tabId);
          callback(tabId);
        })
      })
    });
  } else callback(tabId);
};

/*
  TODO: consistent fix for both ctx-menu and shortcut combo
  TODO: also remove from currentlyRunningIn arr when tab closes
*/

const activateModal = tabId => chrome.tabs.sendMessage(tabId, {activateModal: true});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  injectScripts(tab.id, activateModal);
});

chrome.commands.onCommand.addListener(command => {
  if (command === 'activateModal') {
    chrome.tabs.query({active: true, currentWindow: true}, tabs => {
      injectScripts(tabs[0].id, activateModal);
    });
  }
});

/* worker */

const worker = new SharedWorker('worker.js');

worker.port.start();


chrome.runtime.onConnect.addListener(port => {
  // noop
}); //accept connection


const currentlyRunningIn = [];
const currentlyHlFramed = [];


const checkAvailability = () => {
  return browser.tabs.executeScript({
    code: '' //noop
  })
  .then(res => true, err => {
    return err.message === 'Cannot access contents of the page. Extension manifest must request permission to access the respective host.' ? true : false;
    // this error simply means user has not yet initiated any extension-related action;
    // any other error message means the page cannot be accessed by extensions
  });
};

const clearTabState = (tabId) => {
  [currentlyRunningIn, currentlyHlFramed].forEach(list => {
    const idx = list.indexOf(tabId);
    if (idx > -1) list.splice(idx, 1);
  });
}

const showHlFrame = (tabId) => {

  if (!currentlyHlFramed.includes(tabId)) {
    browser.tabs.executeScript({
      file: "insert-hl-frame.js",
      allFrames: false
    });

    currentlyHlFramed.push(tabId);
  } else {
    chrome.tabs.sendMessage(tabId, {showHlFrame: true}); //forward to tab
  }
};

const hideHlFrame = (tabId) => {
  chrome.tabs.sendMessage(tabId, {hideHlFrame: true}); //forward to tab
};

const handleMsg = (tabs, req) => {

  const tabId = tabs[0].id;

  checkAvailability().then(isAvailable => {
    if (!isAvailable) {
      chrome.runtime.sendMessage({tabUnvailable: true, pageTitle: tabs[0].title});
    } else {
      chrome.runtime.sendMessage({tabIsAvailable: true});

      if (req.showHlFrame) {
        showHlFrame(tabId);
      } else if (req.hideHlFrame) {
        hideHlFrame(tabId);
      }
    }
  });

};

chrome.runtime.onMessage.addListener((req, sender) => {
  if (sender.id === chrome.runtime.id) {
    chrome.tabs.query({active: true, currentWindow: true}, tabs => {
      handleMsg(tabs, req);
    });
  }
});



const ctxMenuId = 'openModal_' + chrome.runtime.id;

chrome.contextMenus.create({
  id: ctxMenuId,
  title: chrome.i18n.getMessage('ctxMenu'),
  contexts: ['editable'],
  visible: false
});



const injectScripts = (tabId, callback) => {
  if (!currentlyRunningIn.includes(tabId)) {
    browser.tabs.executeScript(tabId, {file: "rangy-core.js", allFrames: true})
    .then(() => browser.tabs.executeScript(tabId, {file: "rangy-selectionsaverestore.js", allFrames: true}))
    .then(() => browser.tabs.executeScript(tabId, {file: "content.js", allFrames: true}))
    .then(() => {
      currentlyRunningIn.push(tabId);
      callback(tabId);
    });
  } else callback(tabId);
};

const activateModal = tabId => chrome.tabs.sendMessage(tabId, {activateModal: true});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  injectScripts(tab.id, activateModal);
  //no need to check availability; ctx menu already disabled on unavailable tabs
});

chrome.commands.onCommand.addListener(command => {
  if (command === 'activateModal') {
    checkAvailability().then(isAvailable => {
      if (isAvailable) {
        chrome.tabs.query({active: true, currentWindow: true}, tabs => {
          injectScripts(tabs[0].id, activateModal);
        });
      }
    });
  }
});

const setCtxMenuAvailability = () => {
  checkAvailability().then(isAvailable => {
    chrome.contextMenus.update(ctxMenuId, {
      visible: isAvailable
    });
  })
}



chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  setCtxMenuAvailability();

  if (changeInfo.status === 'loading' || changeInfo.url || changeInfo.discarded) {
    // reload, navigate away, or discard
    clearTabState(tabId);
  }
});

chrome.tabs.onRemoved.addListener(tabId => {
  clearTabState(tabId);
});

chrome.tabs.onActivated.addListener(tabId => {
  setCtxMenuAvailability();
});



const worker = new SharedWorker('worker.js');

worker.port.start();


chrome.runtime.onConnect.addListener(port => {
  // noop
}); //accept connection

const currentlyRunningIn = [];
const currentlyHlFramed = [];

const urlMatchers = ['http://', 'https://', 'file:///'];

const checkActionError = () => {
  return browser.tabs.executeScript({
    code: '' //noop
  }).then(res => null, err => err);
};

const checkAvailabilityAfterUserAction = () => {
  return browser.tabs.executeScript({
    code: '' //noop
  }).then(res => true, err => false);
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

  checkAvailabilityAfterUserAction().then(isAvailable => {
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
  visible: false,
  documentUrlPatterns: urlMatchers.map(el => `${el}*/*`)
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

  checkAvailabilityAfterUserAction().then(isAvailable => {

    // chrome.contextMenus.update(ctxMenuId, {
    //   visible: isAvailable
    // });

    if (isAvailable) {
      injectScripts(tab.id, activateModal); // TODO
    } else {

      // chrome.tabs.update(tab.id, {
      //     url: 'url'
      // });

      console.log('Extension not available on New Tab page.');
    }
  });
});

chrome.commands.onCommand.addListener(command => {
  if (command === 'activateModal') {

    const getTabInfo = browser.tabs.query({active: true, currentWindow: true});

    const getAvailability = checkAvailabilityAfterUserAction();

    Promise.all([getTabInfo, getAvailability]).then((info) => {
      const [tabs, isAvailable] = info;

      const matchesScheme = tabs && tabs[0] && tabs[0].url && urlMatchers.some(scheme => tabs[0].url.startsWith(scheme));

      if (isAvailable && matchesScheme) {
        chrome.tabs.query({active: true, currentWindow: true}, tabs => {
          injectScripts(tabs[0].id, activateModal);
        });
      }

    });

  }
});

const setCtxMenuAvailability = () => {
  checkActionError().then(err => {
    const permissionsNotRequestedMsg = 'Cannot access contents of the page. Extension manifest must request permission to access the respective host.';
    // this is also the msg shown for `chrome://newtab` (which is unavailable)

    const isAvailable = !err || (err.message === permissionsNotRequestedMsg);

    chrome.contextMenus.update(ctxMenuId, {
      visible: isAvailable,
    });
  });
};



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

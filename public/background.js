chrome.runtime.onConnect.addListener(port => console.log('Connected:', port)); //accept connection

chrome.contextMenus.create({
  id: "openModal",
  title: chrome.i18n.getMessage('ctxMenu'),
  contexts: ["editable"]
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  console.log(info, tab);
  chrome.tabs.sendMessage(tab.id, {showModal: true});
});

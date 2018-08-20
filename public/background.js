chrome.runtime.onConnect.addListener(port => {
  console.log('Connected:', port);

  chrome.pageAction.show(port.sender.tab.id);

  port.onDisconnect = () => chrome.pageAction.hide(port.sender.tab.id);

}); //accept connection

chrome.contextMenus.create({
  id: "openModal",
  title: chrome.i18n.getMessage('ctxMenu'),
  contexts: ["editable"]
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  console.log(info, tab);
  chrome.tabs.sendMessage(tab.id, {showModal: true});
});

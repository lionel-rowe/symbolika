
const isEditable = node => {
  return (node.tagName === 'INPUT' && ['text', 'search', 'password', 'url'].includes(node.type))
        || node.tagName === 'TEXTAREA'
        || node.isContentEditable;
};

const modalId = 'modal_' + chrome.runtime.id;
const backdropId = 'backdrop_' + chrome.runtime.id;

const indexSrc = chrome.extension.getURL('index.html');

const maxZIdx = '9'.repeat(308); //https://stackoverflow.com/questions/3443237/maximum-z-index-value-for-chrome

let modal;
let backdrop;
let loadMsg;
let prevEl;
let escListener;

let selection = {type: null};

function cleanup() {
  modal.style.display = 'none';
  backdrop.style.display = 'none';

  prevEl.blur();
  prevEl.focus();

  if (selection.type === 'simple') {
    prevEl.setSelectionRange(selection.range.selectionStart, selection.range.selectionEnd, selection.range.selectionDirection);
  } else if (selection.type === 'rangy') {
    rangy.restoreSelection(selection.range);
  }

  window.removeEventListener('keyup', escListener);
  // chrome.runtime.onMessage.removeListener(msgListener);
}

let shouldRefresh = false;

let hiddenInput; //needs this scope to be referred to later

let isInitialDisplay = true;

const activateModal = () => {
  prevEl = document.activeElement; //before switching focus to hiddenInput

  if (['INPUT', 'TEXTAREA'].includes(prevEl.tagName)) {
    selection = {
      type: 'simple',
      range: {
        selectionStart: prevEl.selectionStart, selectionEnd: prevEl.selectionEnd, selectionDirection: prevEl.selectionDirection
      }
    };
  } else {
    selection = {
      type: 'rangy',
      range: rangy.saveSelection()
    };

    document.querySelector('.rangySelectionBoundary').style = null;

  }

  if (isInitialDisplay) {
    hiddenInput = document.createElement('input');
    hiddenInput.type = 'text';
    hiddenInput.style = 'opacity:0;border:none;position:fixed;'
    document.body.appendChild(hiddenInput);
    hiddenInput.focus();
    isInitialDisplay = false;
  }

  displayModal();
};

chrome.runtime.onMessage.addListener((req, sender) => {
  if ((sender.id === chrome.runtime.id) && req.activateModal) {
    activateModal();
  }
});

const updateMsg = chrome.i18n.getMessage('updateMsg', chrome.i18n.getMessage('extName')); //must be set outside function scope, otherwise `chrome.i18n` will no longer be available

function promptReload() {
  alert(updateMsg);
}

function displayModal() {

  if (shouldRefresh) {
    promptReload();
  } else if (
    !document.querySelector(`#${modalId}`)
    && isEditable(document.activeElement)
  ) {
    modal = document.createElement('iframe');
    modal.id = modalId;
    // modal.style = `
    //   width: 620px !important;
    //   min-height: 500px !important;
    //   position: fixed !important;
    //   top: 50% !important;
    //   left: 50% !important;
    //   z-index: ${maxZIdx} !important;
    //   transform: translate(-50%, -50%) !important;
    //   border-radius: 9px !important;
    //   box-shadow: 0 0 40px rgba(0,0,0,0.1), 0 0 10px rgba(0,0,0,0.25) !important;
    //   background: #fff !important;
    //   box-sizing: border-box !important;
    //   border: none !important;
    //   filter: blur(0) !important;
    //   -webkit-filter: blur(0) !important;
    //   display: none !important;
    // `;

    modal.style = `
      width: 100vw !important;
      height: 100vh !important;
      position: fixed !important;
      z-index: ${maxZIdx} !important;
      background: transparent !important;
      box-sizing: border-box !important;
      border: none !important;
      filter: blur(0) !important;
      -webkit-filter: blur(0) !important;
      display: none !important;
      top: 0 !important;
      left: 0 !important;
      right: 0 !important;
      bottom: 0 !important;
    `;

    modal.src = indexSrc;

    modal.onload = () => {
      modal.style.display = null;

      chrome.runtime.sendMessage({capturedInput: hiddenInput.value});

      loadMsg.remove();
      hiddenInput.remove();
    }

    /* results in significantly _worse_ UX - don't use */
    // chrome.runtime.onMessage.addListener((req, sender) => {

    //   if (sender.id === chrome.runtime.id && req.ready) {

    //     modal.style.display = null;

    //     chrome.runtime.sendMessage({capturedInput: hiddenInput.value});

    //     loadMsg.remove();
    //     hiddenInput.remove();
    //   }
    // });

    backdrop = document.createElement('div');
    backdrop.id = backdropId;
    backdrop.style = `
      position: fixed !important;
      background: rgba(0,0,0,0.7) !important;
      z-index: ${maxZIdx} !important;
      top: 0 !important;
      bottom: 0 !important;
      left: 0 !important;
      right: 0 !important;
      box-sizing: border-box !important;
    `;

    loadMsg = document.createElement('div');
    loadMsg.textContent = 'Loading…';
    loadMsg.style = `
      position: absolute !important;
      color: white !important;
      top: 50% !important;
      left: 50% !important;
      transform: translate(-50%, -50%) !important;
      font-size: 18px !important;
    `;

    backdrop.appendChild(loadMsg);

    document.querySelector('body').appendChild(backdrop);
    document.querySelector('body').appendChild(modal);

    function setTimeoutIfSlack(fn, timeoutLengthMs) {
      if (/\.slack\.com$/.test(window.location.hostname)) { //hack to get Slack to behave correctly on various actions
        window.setTimeout(() => fn(), timeoutLengthMs);
      } else {
        fn();
      }
    }

    function msgListener(req, sender) {
      if (sender.id === chrome.runtime.id && typeof req.closeWithChar !== 'undefined') {
        if (req.closeWithChar) {
          cleanup();

          setTimeoutIfSlack(() => {
            document.execCommand('insertText', null, req.closeWithChar);
          }, 0); // must be forced to async, otherwise insertion position
          // is not correct at end of multiline input

        } else {
          setTimeoutIfSlack(cleanup, 100); // yes, seriously...
          // cleanup must be within timeout if char is to be inserted, and outside
          // of it if no char to be inserted. this is due to default Slack behavior
          // on `Esc` key, which resets cursor position to start of input box.
        }
      }
    }

    function escListener(e) {
      if (e.key === 'Escape') {
        setTimeoutIfSlack(cleanup, 100);
      }
    }

    window.addEventListener('keyup', escListener);
    chrome.runtime.onMessage.addListener(msgListener);

    backdrop.addEventListener('click', cleanup); //TODO: fix (broken now that `modal` takes up whole screen)

  } else if (
    modal && modal.style.display === 'none'
    && isEditable(document.activeElement)
  ) {
    prevEl = document.activeElement;

    modal.style.display = null;
    backdrop.style.display = null;
    window.addEventListener('keyup', escListener);

    chrome.runtime.sendMessage({reinit: true});

  }
}

const port = chrome.runtime.connect(chrome.runtime.id);

port.onDisconnect.addListener(() => {
  modal && modal.remove();
  backdrop && backdrop.remove();
  shouldRefresh = true;
});

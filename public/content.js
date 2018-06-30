
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

function cleanup() {
  modal.style.display = 'none';
  backdrop.style.display = 'none';
  prevEl.focus();
  window.removeEventListener('keyup', escListener);
  // chrome.runtime.onMessage.removeListener(msgListener);
}

window.addEventListener('keydown', (e) => {
  if (e.ctrlKey && (e.key === ',')) {

    if (
      !document.querySelector(`#${modalId}`)
      && isEditable(document.activeElement)
    ) {
      modal = document.createElement('iframe');
      modal.id = modalId;
      modal.style = `
        width: 600px !important;
        height: 450px !important;
        position: fixed !important;
        top: 50% !important;
        left: 50% !important;
        z-index: ${maxZIdx} !important;
        transform: translate(-50%, -50%) !important;
        border-radius: 9px !important;
        box-shadow: 0 0 40px rgba(0,0,0,0.1), 0 0 10px rgba(0,0,0,0.25) !important;
        background: #fff !important;
        box-sizing: border-box !important;
        border: none !important;
        filter: blur(0) !important;
        -webkit-filter: blur(0) !important;
        display: none !important;
      `;

      modal.src = indexSrc;

      modal.onload = () => {
        modal.style.display = null;
        loadMsg.remove();
      }

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

      prevEl = document.activeElement;

      document.querySelector('body').appendChild(backdrop);
      document.querySelector('body').appendChild(modal);

      function msgListener(req, sender) {
        if (sender.id === chrome.runtime.id && typeof req.closeWithChar !== 'undefined') {
          cleanup();
          document.execCommand('insertText', null, req.closeWithChar || '');
        }
      }

      function escListener(e) {
        if (e.key === 'Escape') {
          cleanup();
        }
      }

      window.addEventListener('keyup', escListener);
      chrome.runtime.onMessage.addListener(msgListener);

      backdrop.addEventListener('click', cleanup);

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
});


const maxZIdx = '9'.repeat(308); //https://stackoverflow.com/questions/3443237/maximum-z-index-value-for-chrome

const hlFrame = document.createElement('div');
hlFrameId = `hlFrame_${chrome.runtime.id}`;
hlFrame.id = hlFrameId;

hlFrame.innerHTML = `<style>
  #${hlFrameId} {
    position: fixed;
    top: 0;
    bottom: 0;
    left: 0;
    right: 0;
    box-sizing: border-box;
    border: ${Math.ceil(8 / window.devicePixelRatio)}px dashed rgba(200, 0, 0, 0.6);
    z-index: ${maxZIdx};
  }
  </style>`;

// background: rgba(3, 1, 38, 0.5);
// background: linear-gradient(0deg, rgba(3, 1, 38, 0.5) 0%, rgba(24, 24, 112, 0.5) 50%, rgba(145, 204, 215, 0.5) 100%);

document.body.appendChild(hlFrame);

const changeVisibility = (visibility) => {
  if (typeof visibility !== 'boolean') {
    throw new TypeError('Visibility not specified')
  } else {
    hlFrame.style.display = visibility ? 'block' : 'none';
  }
};

hlFrame.addEventListener('click', () => changeVisibility(false));
window.addEventListener('focus', () => changeVisibility(false));

chrome.runtime.onMessage.addListener((req, sender) => {
  if (sender.id === chrome.runtime.id) {
    if (req.showHlFrame) {
      changeVisibility(true);
    } else if (req.hideHlFrame) {
      changeVisibility(false);
    }
  }
});

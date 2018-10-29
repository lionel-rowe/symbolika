
// const browser = window.chrome || window.browser || {};

// let msgs = {};

// const i14e = (key, subs) => {
//   if (browser.i18n) { //production
//     return browser.i18n.getMessage(key, subs);
//   } else { //dev
//     return (msgs[key] && msgs[key].message);
//   }
// };

chrome.runtime.sendMessage({checkAvailability: true});

const i14e = (...args) => chrome.i18n.getMessage(...args);

const title = document.querySelector('title');
const heading = document.querySelector('#heading');
const content = document.querySelector('#content');

title.textContent = i14e('extName');
heading.textContent = i14e('extName');

let checkedAvailability = false;

chrome.runtime.onMessage.addListener((req, sender) => {
  if (sender.id === chrome.runtime.id && !checkedAvailability) {
    if (req.tabUnvailable) {
      showUnavailable(req.pageTitle);
    } else if (req.tabIsAvailable) {
      showIsAvailable();
    }
    checkedAvailability = true;
  }
});

const hideHlFrame = () => {
  chrome.runtime.sendMessage({hideHlFrame: true});
};

const showHlFrame = () => {
  chrome.runtime.sendMessage({showHlFrame: true});
}

// HACK - should be `onbeforeunload`, but that event does not fire for popup pages

window.onkeydown = e => {
  if (e.key === 'Escape') {
    hideHlFrame();
  }
};

window.onblur = () => {
  hideHlFrame();
};

// end of hack

function showUnavailable(pageTitle) {
  content.innerHTML = i14e('popup_unavailableMsg', [i14e('extName'), pageTitle]);
}

function showIsAvailable() {
  const commands = chrome.commands.getAll(commands => {

    const shortcutRaw = commands.find(el => el.name === 'activateModal').shortcut;

    // Mac shortcut format: '⌘Comma'
    // Windows shortcut format: 'Ctrl+Comma'

    const macKeyRegex = /[⌘⌥⌃⇧]/g;

    const shortcutArr = macKeyRegex.test(shortcutRaw)
      ? shortcutRaw.match(macKeyRegex).concat(shortcutRaw.replace(macKeyRegex, '').trim())
      : shortcutRaw.split('+');

    const shortcut = shortcutArr.map(key => `<kbd>${key}</kbd>`).join(' + ');

    const showLinkText = i14e('popup_showUsableAreaLinkName');

    const msg = `<p>${i14e('popup_usageInstructions', [shortcut, i14e('ctxMenu'), `<a id='showHideUsableAreaLink' href='#'>${showLinkText}</a>`])}
    </p><p>
    ${i14e('popup_changeShortcutInstructions', [`<a id='changeShortcutLink' href='#'>${i14e('popup_changeShortcutsLinkName')}</a>`])}</p>`;

    content.innerHTML = msg;

    const changeShortcutLink = document.querySelector('#changeShortcutLink');

    changeShortcutLink.onclick = e => {
      e.preventDefault();
      chrome.tabs.create({url: 'chrome://extensions/shortcuts'});
    };

    // let usableAreaShown = false;

    const showHideUsableAreaLink = document.querySelector('#showHideUsableAreaLink');

    // showHideUsableAreaLink.onmousedown = e => {
    //   e.preventDefault();
    //   // if (usableAreaShown) {
    //     // hideHlFrame();
    //     // showHideUsableAreaLink.textContent = showLinkText;
    //   // } else {
    //     showHlFrame();
    //     showHideUsableAreaLink.addEventListener('mouseenter', showHlFrame);
    //     // showHideUsableAreaLink.textContent = hideLinkText;
    //   // }
    //   // usableAreaShown = !usableAreaShown;
    // };

    const clickHandler = e => {
      e.preventDefault();
      showHlFrame();
      showHideUsableAreaLink.addEventListener('mouseenter', showHlFrame);
    };

    const hideAndRemoveIfUnClicked = e => {
      e.preventDefault();
      hideHlFrame();
      if (!(e.buttons & 1)) {
        // event.buttons is vals assigned to each mouse button ORed together; `1` is left-click
        showHideUsableAreaLink.removeEventListener('mouseenter', showHlFrame);
      }
    };

    const hideAndRemoveAlways = e => {
      e.preventDefault();
      hideHlFrame();
      // event.buttons is vals assigned to each mouse button ORed together; `1` is left-click
      showHideUsableAreaLink.removeEventListener('mouseenter', showHlFrame);
    };

    showHideUsableAreaLink.addEventListener('mousedown', clickHandler);
    showHideUsableAreaLink.addEventListener('mouseleave', hideAndRemoveIfUnClicked);
    document.addEventListener('mouseup', hideAndRemoveAlways);

  });
}

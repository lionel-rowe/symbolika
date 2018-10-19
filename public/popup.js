
// const browser = window.chrome || window.browser || {};

// let msgs = {};

// const i14e = (key, subs) => {
//   if (browser.i18n) { //production
//     return browser.i18n.getMessage(key, subs);
//   } else { //dev
//     return (msgs[key] && msgs[key].message);
//   }
// };

const i14e = (...args) => chrome.i18n.getMessage(...args);

const title = document.querySelector('title');
const heading = document.querySelector('#heading');
const content = document.querySelector('#content');

title.textContent = i14e('extName');
heading.textContent = i14e('extName');

const commands = chrome.commands.getAll(commands => {
  console.log(commands);

  const shortcutRaw = commands.find(el => el.name === 'activateModal').shortcut;

  // Mac shortcut format: '⌘Comma'
  // Windows shortcut format: 'Ctrl+Comma'

  const macKeyRegex = /[⌘⌥⌃⇧]/g;

  const shortcutArr = macKeyRegex.test(shortcutRaw)
    ? shortcutRaw.match(macKeyRegex).concat(shortcutRaw.replace(macKeyRegex, '').trim())
    : shortcutRaw.split('+');

  const shortcut = shortcutArr.map(key => `<kbd>${key}</kbd>`).join(' + ');

  let msg = `<p>${i14e('popup_usageInstructions', [shortcut, i14e('extName')])}`;
  msg += `</p><p>`;
  msg += `${i14e('popup_changeShortcutInstructions', [`<a id='changeShortcutLink' href='#'>${i14e('popup_linkName')}</a>`])}</p>`;

  content.innerHTML = msg;

  const changeShortcutLink = document.querySelector('#changeShortcutLink');

  changeShortcutLink.onclick = e => {
    e.preventDefault();
    chrome.tabs.create({url: 'chrome://extensions/shortcuts' /*'https://www.so.com'*/});
  };

});

import math from './math.js';

//modified from https://stackoverflow.com/a/35173443

export default (event) => {
  //add all elements we want to include in our selection
  const dom = event.view.document;
  const idxModifier = event.shiftKey ? -1 : +1;
  const focusableSelector = 'a:not([disabled]), button:not([disabled]), input:not([disabled]), [tabindex]:not([disabled]):not([tabindex="-1"])';
  const defaultFirstElementSelector = '#searchbox';
  const focusable = Array.prototype.filter.call(dom.querySelectorAll(focusableSelector),
  el => {
    //check for visibility while always including the current activeElement
    const include = el.offsetWidth > 0 || el.offsetHeight > 0 || el === dom.activeElement;
    return include;
  });
  const idx = focusable.indexOf(dom.activeElement);
  if (idx > -1) {
     const nextElement = focusable[math.mod(idx + idxModifier, focusable.length)];
     nextElement.focus();
  } else {
    (
      dom.querySelector(defaultFirstElementSelector)
      || focusable[0]
    ).focus();
  }
}

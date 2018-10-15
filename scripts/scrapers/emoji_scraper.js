//https://api.github.com/emojis

const dat = JSON.parse(document.querySelector('pre').textContent)

json = Object.keys(dat).map(key => {

  const m = dat[key].match(/unicode\/([0-9a-f-]+)\.png\?v8$/i)

  if (!m) return;

  const cpsHex = m[1].split('-');

  const cpsDec = cpsHex.map(cp => parseInt(cp, 16));

  const chars = cpsDec.map(cp => String.fromCodePoint(cp));

  const joiner = /[\u{1f1e6}-\u{1f1ff}]/u.test(chars[0]) ? '' : '\u200d';

  const char = chars.join(joiner);

  return {
    name: key,
    char: char
  }
}).filter(Boolean)

JSON.stringify(json);

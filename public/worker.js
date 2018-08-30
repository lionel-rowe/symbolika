// a shared worker

importScripts('elasticlunr.min.js');

let chars, elunrIndexRaw, elunrIndex;

const urls = ['./elunrIndex.json', './_locales/en/chars.json']; //public

//TODO: swap out chars for elunrIndex.documentStore.docs - redundant (?)

Promise.all(urls.map(url => {

  return fetch(url, {cache: 'no-store'}).then(dat => {

    tsPostFetch = new Date().valueOf();

    return dat.json();
  });
})).then(jsons => {

  elunrIndexRaw = jsons[0];

  chars = jsons[1];

  elunrIndex = elasticlunr.Index.load(elunrIndexRaw);
  elasticlunr.clearStopWords();

});

const globals = Object.keys(self);

onconnect = e => {
  const port = e.ports[0];

  port.addEventListener('message', e => {

    console.log(e);

    const input = e.data.input;

    if (!input) {
      port.postMessage({input: '', choices: []});
      return;
    }

    const trimmed = input.trim();

    const searchTypes = [
      {pattern: /^&#x([0-9a-f]{1,6});$/i, type: 'codePointHex'},
      {pattern: /^&#([0-9]{1,7});$/i, type: 'codePointDec'},
      {pattern: /^&([0-9a-z]+);$/i, type: 'html'},
      {pattern: /^\\u{([0-9a-f]{1,6})}$/i, type: 'codePointHex'},
      {pattern: /^\\u([0-9a-f]{4})$/i, type: 'codePointHex'},
      {pattern: /^u\+([0-9a-f]{4,6})$/i, type: 'codePointHex'},
      {pattern: /^0x([0-9a-f]{1,6})$/i, type: 'codePointHex'},
      {pattern: /^:([\s\S]+):?$/, type: 'emoji'},
      {pattern: /^([\s\S]+)$/, type: 'bare'}, //catchall
      {pattern: /^$/, type: 'empty'} //catchall
    ];

    let searchItem;

    for (let i = 0; i < searchTypes.length; i++) {

      const m = trimmed.match(searchTypes[i].pattern);

      if (m) {
        searchItem = {
          content: m[1] || '',
          type: searchTypes[i].type
        };
        break;
      }

    }

    let choices = [];
    const seenLookup = Object.create(null);

    if (searchItem.type === 'codePointHex' || searchItem.type === 'codePointDec') {

      const cp = parseInt(searchItem.content, searchItem.type === 'codePointHex' ? 16 : 10);

      const eligibles = chars.filter(char => Array.from(char.char).length === 1);
      const cps = eligibles.map(char => char.char.codePointAt());

      const match = eligibles[cps.indexOf(cp)];

      choices = match ? [match] : [];

    } else {

      const typeFilterCond = ['html', 'emoji'].includes(searchItem.type)
        ? el => el.type === searchItem.type
        : el => true;

      const shouldExpand = searchItem.content.split(/\W+/).filter(word => word && word.length <= 2).length <= 1; //without this condition, searching for multiple 1- or 2-letter words yields very poor performance 

      const matchedRefs = elunrIndex.search(searchItem.content, {bool: 'AND', expand: shouldExpand});

      const matchList = matchedRefs.map(el => {
        return chars[el.ref];
      });

      choices = matchList
      .filter(el => typeFilterCond(el))
      .filter(el => {
        return !seenLookup[el.char] && (seenLookup[el.char] = true);
      });

    }

    port.postMessage({input, choices});

  });

  port.start(); // Required when using addEventListener. Otherwise called implicitly by onmessage setter.
};

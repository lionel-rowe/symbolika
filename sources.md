# SOURCES

* [Unicode](https://github.com/unicode-table/unicode-table-data) (replace old with this; note includes combined forms)
* [Emoji](https://api.github.com/emojis) (replace [old](https://gist.github.com/rxaviers/7360908) with this)
* [HTML entities](https://dev.w3.org/html5/html-author/charref)
* [Combined emoji](http://unicode.org/emoji/charts/emoji-zwj-sequences.html)
* [CLDR](https://unicode.org/cldr/charts/dev/annotations/index.html)?
  - http://cldr.unicode.org/index ?
  - https://github.com/unicode-cldr/cldr-json#cldr-json ?

```
{ //https://dev.w3.org/html5/html-author/charref
  
let out = [];

const dat = Array.from(document.querySelectorAll('tr')).map(el => {
  return {char: el.querySelector('.character').textContent.match(/ ([\s\S])/u)[1], names: el.querySelector('.named').textContent.match(/&.+?;/g)};
});

dat.forEach(el => {

  const all = el.names.map(name => {
    return {name: name.match(/[^&;]+/)[0], char: el.char};
  });
  
  out = out.concat(all);

});

out;

}
```
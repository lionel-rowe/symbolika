const elasticlunr = require('elasticlunr');

elasticlunr.clearStopWords();

fetch('../public/_locales/en/chars.json', {cache: 'no-store'})
.then(dat => dat.json())
.then(json => {

  chars = json;

  elunrIndex = elasticlunr(function () {
    this.addField('name');
    this.setRef('id');
  });

  chars.forEach((el, idx) => {
    el.id = idx;
    elunrIndex.addDoc(el);
  });

  console.log(JSON.stringify(elunrIndex.toJSON()));

});

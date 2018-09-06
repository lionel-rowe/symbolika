
const fs = require('fs');

const [aliases, emojis, entities, unicodes] = ['aliases', 'emoji_new', 'html_entities', 'unicode_chars'].map(el => JSON.parse(fs.readFileSync(`raw_data/${el}.json`, 'utf8')));


unicodes.forEach(el => {
  if (el.name.toLowerCase().includes('myanmar')) { //language also referred to as "Burmese"
    const alias = {char: el.char, name: el.name.replace(/myanmar/gi, 'Burmese'), type: 'alias'};
    aliases.push(alias);
  }
  if (el.name.toLowerCase().includes('diaeresis')) { //combining mark also referred to as "umlaut"
    const alias = {char: el.char, name: el.name.replace(/diaeresis/gi, 'Umlaut'), type: 'alias'};
    aliases.push(alias);
  }
});


const chars = entities.map(el => {
    return {char: el.char, name: el.name, type: 'html'};
  }
).concat(unicodes.map(el => {
    return {char: el.char, name: el.name/*.toLowerCase()*/, type: 'unicode'};
  }).filter(el => {
    return el.name !== '<Not a Character>';
  })
).concat(emojis.map(el => {
    if (el.char.codePointAt() === 128405) el.name = 'middle finger'; //prevent accidentally getting obscene emoji when typing the innocent substring "fu..."
    return {char: el.char, name: el.name, type: 'emoji'};
  })
).concat(aliases.map(el => {
    return {char: el.char, name: el.name, type: 'alias'};
  })
);



const file = JSON.stringify(chars);

fs.writeFileSync('public/_locales/en/chars.json', file);

console.log(`Char data written with length: ${file.length} characters`);



const elasticlunr = require('elasticlunr');

elasticlunr.clearStopWords();

const json = JSON.parse(fs.readFileSync(`public/_locales/en/chars.json`, 'utf8'));

elunrIndex = elasticlunr(function () {
  this.addField('name');
  this.setRef('id');
});

json.forEach((el, idx) => {
  el.id = idx;
  elunrIndex.addDoc(el);
});

const indexContent = JSON.stringify(elunrIndex.toJSON());

fs.writeFileSync('public/elunrIndex.json', indexContent);

console.log(`Index written with length: ${indexContent.length} characters`);




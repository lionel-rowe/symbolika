
const fs = require('fs');

const [aliases, emojis, entities, unicodes] = ['aliases', 'emoji', 'html_entities', 'unicode_chars'].map(el => JSON.parse(fs.readFileSync(`raw_data/${el}.json`, 'utf8')));

const chars = entities.map(el => ({char: el.char, name: el.name, type: 'html'}))
.concat(emojis.map(el => ({char: el.char, name: el.name, type: 'emoji'})))
.concat(unicodes.map(el => ({char: el.char, name: el.name.toLowerCase(), type: 'unicode'})))
.concat(aliases.map(el => ({char: el.char, name: el.name, type: 'alias'})));

const file = JSON.stringify(chars);

fs.writeFileSync('public/_locales/en/chars.json', file);

console.log(`File written with length: ${file.length} characters`);

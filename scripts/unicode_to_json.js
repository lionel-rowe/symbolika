
const fs = require('fs');

const parentDir = './raw_data/unicode-table-data-master/loc/en/symbols';

const filesAndDirs = fs.readdirSync(parentDir);

const plane0Files = filesAndDirs.filter(el => /\.txt$/.test(el));
const dirs = filesAndDirs.filter(el => /^plane[^\.]+$/.test(el));

// const files = dirs.reduce((all, dir) => {
//   const filesInDir = fs.readdirSync(`${parentDir}/${dir}`).map(el => `${dir}/${el}`);
//   return all.concat(filesInDir);
// }, plane0Files).map(el => `${parentDir}/${el}`);

const files = plane0Files.map(el => `${parentDir}/${el}`);

const allData = files.map(file => fs.readFileSync(file, 'utf8')).join('\n');

const meat = /^([0-9A-F]+)\s*:\s*(.+)$/i;
const splitter = /\s*:\s*/;

const chars = allData
.trim()
.split(/\n+/)
.map(line => {
  return line.match(meat);
})
.filter(Boolean)
.map(el => {
  return {
    codepoint: el[1],
    names: el[2].split(splitter)
  };
});

const formatted = [];

chars.forEach(el => {

  const items = el.names.map(name => {
    // return {char: el.codepoint, name: name, type: 'unicode'};
    return {name: name, char: String.fromCodePoint(parseInt(el.codepoint, 16))};
  });

  items.forEach(item => formatted.push(item));

});

const file = JSON.stringify(formatted);

fs.writeFileSync(`raw_data/unicode_chars.json`, file);

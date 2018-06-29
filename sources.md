https://github.com/unicode-table/unicode-table-data
https://gist.github.com/rxaviers/7360908
https://dev.w3.org/html5/html-author/charref


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
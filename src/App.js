/*global chrome*/

import React from 'react';
import './App.css';
import config from './config.js';
import math from './math.js';
import Logo from './Logo.js';
import CloseButton from './CloseButton.js';
import Pagination from './Pagination.js';
import elasticlunr from 'elasticlunr';
import twemoji from 'twemoji';


// const mod = (n1, n2) => ((n1 % n2) + n2) % n2;

elasticlunr.clearStopWords();

const maxSearchLength = 32;

let msgs = {};

const i14e = (key) => {
  if (chrome.i18n) { //production
    return chrome.i18n.getMessage(key);
  } else { //dev
    return (msgs[key] && msgs[key].message);
  }
}

let chars = [];
let elunrIndex = elasticlunr(() => null);

class App extends React.Component {

  initVals = {
    input: '',
    choices: [],
    rowIdx: 0, //previously: -1
    listenForKeyup: false,
    // elunrLoaded: false //NOTE: should not be in here due to reinit
  };

  state = this.initVals;

  initState = () => this.setState(this.initVals);

  closeWithChar(char) {

    document.querySelector('#searchbox').focus();

    this.initState();
    if (chrome.tabs) { //production
      chrome.tabs.query({active: true, currentWindow: true}, tabs => {
        chrome.tabs.sendMessage(tabs[0].id, {closeWithChar: char});
      });
    } else { //testing
      console.log('Closed with char', char);
    }
  }

  keyupListener(e, idx) {
    if (math.getMinDisplayedIdx(this.state.rowIdx) + +e.key - 1 === idx && this.state.listenForKeyup) {
      this.setState({rowIdx: idx});
      this.closeWithChar(this.state.choices[idx].char);
      this.setState({listenForKeyup: false});
    }
  }

  isOptionChooser(e) {
    if (document.activeElement.id !== 'searchbox') { //outside search box
      return true;
    } else {
      return config.useModKeyForLiterals
        ? !e.ctrlKey
        : e.ctrlKey;
    }
  }

  updateChoices() {

    const input = this.state.input;

    this.setState({
      rowIdx: 0
    });

    if (!input) {
      this.setState({input: '', choices: []});
      return;
    }

    const trimmed = input.trim();

    const searchTypes = [
      //tested in order - more specific must come first
      //first capture group of pattern is the content
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
        // return {
        //   ref: el.ref,
        //   score: el.score,
        //   char: chars[el.ref].char,
        //   name: chars[el.ref].name,
        //   type: chars[el.ref].type
        // };
        return chars[el.ref];
      });

      // console.log(matchList);

      choices = matchList
      .filter(el => typeFilterCond(el))
      // .sort((a, b) => {

      //   const aPerfect = a.name === input;
      //   const bPerfect = b.name === input;

      //   const aPerfectPartial = a.name.slice(0, input.length) === input;
      //   const bPerfectPartial = b.name.slice(0, input.length) === input;

      //   // const aContentOnly = contentOnly(a.name).slice(0, inputContentOnly.length) === inputContentOnly;
      //   // const bContentOnly = contentOnly(b.name).slice(0, inputContentOnly.length) === inputContentOnly;

      //   return (+isCodepointMatch(b) - +isCodepointMatch(a))
      //     || (bPerfect - aPerfect)
      //     || (bPerfectPartial - aPerfectPartial)
      //     // || (bContentOnly - aContentOnly)
      //     // || (a.score - b.score)
      //     || (a.name.length - b.name.length);
      // })
      .filter(el => {
        return !seenLookup[el.char] && (seenLookup[el.char] = true);
      }); //filters non-unique chars
      // .sort((a, b) => {
      //   // return b.score - a.score
      //   // || a.char.charCodeAt() - b.char.charCodeAt()
      // });

    }

    this.setState({
      input,
      choices
    });

  }

  componentDidMount() {

    chrome.runtime && chrome.runtime.onMessage && chrome.runtime.onMessage.addListener((req, sender) => {
      if (sender.id === chrome.runtime.id && req.capturedInput) {
        // initialInput = req.capturedInput;
        this.setState({input: req.capturedInput});
      }
    });

    if (!chrome.i18n) {
      fetch('./_locales/en/messages.json', //public
        {cache: 'no-store'}
      ).then(dat => dat.json())
      .then(json => {
        msgs = json;
        this.forceUpdate();
      });
    }

    const urls = ['./elunrIndex.json', './_locales/en/chars.json']; //public

    //TODO: swap out chars for elunrIndex.documentStore.docs - redundant (?)

    const ts0 = new Date().valueOf();
    let tsPostFetch;

    Promise.all(urls.map(url => {

      return fetch(url, {cache: 'no-store'}).then(dat => {

        tsPostFetch = new Date().valueOf();

        return dat.json();
      });
    })).then(jsons => {

      const tsPostJsonParse = new Date().valueOf();

      elunrIndex = elasticlunr.Index.load(jsons[0]);

      chars = jsons[1];

      this.setState({elunrLoaded: true});
      this.updateChoices();
      // this.forceUpdate();

      const tsPostIndexParse = new Date().valueOf();

      console.log(`fetch: ${tsPostFetch - ts0}ms; JSON parse: ${tsPostJsonParse - tsPostFetch}ms; index parse: ${tsPostIndexParse - tsPostJsonParse}ms`);

      if (chrome.tabs) { //production
        chrome.tabs.query({active: true, currentWindow: true}, tabs => {
          chrome.tabs.sendMessage(tabs[0].id, {ready: true});
        });
      } 


    });

    document.addEventListener('keydown', e => { //applies only to document within

      const idx = parseInt(e.key, 10) - 1;

      if (['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp'].includes(e.key)) {
        //direction keys

        const rowIdx = this.state.rowIdx;
        const totalRows = this.state.choices.length;

        if (e.key === 'ArrowDown') {
          e.preventDefault();
          this.setState({rowIdx: math.incrementRowIdx(rowIdx, totalRows)});
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          this.setState({rowIdx: math.decrementRowIdx(rowIdx, totalRows)});
        } else if (e.key === 'PageDown') {
          e.preventDefault();
          this.setState({rowIdx: math.incrementPageNumber(rowIdx, totalRows)});
        } else if (e.key === 'PageUp') {
          e.preventDefault();
          this.setState({rowIdx: math.decrementPageNumber(rowIdx, totalRows)});
        }

      } else if (!isNaN(idx) && !e.altKey) { //is a num key (ignore w alt)
        e.preventDefault();
        if (this.isOptionChooser(e) && this.state.choices[math.getMinDisplayedIdx(this.state.rowIdx) + idx]) { //is option chooser and option is available
          this.setState({
            rowIdx: math.getMinDisplayedIdx(this.state.rowIdx) + idx,
            listenForKeyup: true
          });
          document.onkeyup = e => this.keyupListener(e, math.getMinDisplayedIdx(this.state.rowIdx) + idx);
        } else if (!this.isOptionChooser(e)) { //num key but not option chooser
          document.execCommand('insertText', null, e.key); //replace default behavior
        }
      } else if (e.key === 'Enter') {
        
        const selected = this.state.rowIdx > 0 ? this.state.rowIdx : 0;

        if (e.target.id === 'searchbox' && selected < this.state.choices.length) {
          this.closeWithChar(this.state.choices[selected].char);
        }

      } else if (e.key === 'Escape') {
        if (this.state.input) {
          this.setState({rowIdx: 0, input: '', choices: []});
        } else {
          this.closeWithChar(null);
        }
      }

      function msgListener(req, sender, thisArg) {
        if (sender.id === chrome.runtime.id && req.reinit) { // reinit
          thisArg.initState();
          document.querySelector('#searchbox').focus();
        }
      }

      chrome.runtime && chrome.runtime.onMessage && chrome.runtime.onMessage.addListener((req, sender) => msgListener(req, sender, this));

    });

    document.querySelector('#searchbox').focus();

  }

  render() {

    return (
      <div className='modal'>
        <header>
          <h1>
            <Logo /> {i14e('modal_title')} <CloseButton closeAction={() => this.closeWithChar(null)} />
          </h1>
        </header>
        <form
          onSubmit={e => {
            e.preventDefault();
          }}
        >
          <input
            type='search'
            placeholder={i14e('modal_searchBox_placeholder')}
            autoComplete='off'
            id='searchbox'
            value={this.state.input}
            onChange={e => {

              this.setState({input: e.target.value}, () => {
                if (this.state.elunrLoaded) this.updateChoices();
              });

            }}
            maxLength={maxSearchLength}
          />
          <div className='resultSpace'>
          {this.state.input ? 
          (<table>
            <thead>
              <tr>
                <th style={{width: '4em'}}>{i14e('modal_resultsTable_col_number')}</th>
                <th style={{width: '18em'}}>{i14e('modal_resultsTable_col_name')}</th>
                <th>{i14e('modal_resultsTable_col_codepoint')}</th>
                <th>{i14e('modal_resultsTable_col_char')}</th>
              </tr>
            </thead>
            <tbody>{
            !this.state.elunrLoaded
              ? (<tr>
                <td colSpan={4}>{i14e('modal_resultsTable_msg_loadingData')}</td>
              </tr>)
              :
            !this.state.choices.length
              ? (<tr>
                <td colSpan={4}>{i14e('modal_resultsTable_msg_noResults')}</td>
              </tr>)
              : this.state.choices
              .filter((el, idx) => {
                // return idx > config.resultsToDisplay;
                return idx >= math.getMinDisplayedIdx(this.state.rowIdx)
                  && idx < math.getMaxDisplayedIdx(this.state.rowIdx)
              })
              .map((el, idx) => {
                return (<tr
                  key={idx}

                  onMouseEnter={() => this.setState({rowIdx: math.getMinDisplayedIdx(this.state.rowIdx) + idx})}

                  // onFocus={() => this.setState({rowIdx: idx})}
                  // onBlur={() => this.setState({rowIdx: idx})}

                  onClick={() => this.closeWithChar(this.state.choices[this.state.rowIdx].char)}

                  className={math.getFauxcus(this.state.rowIdx) === idx ? 'fauxcused' : null}

                >
                  <td>{idx + 1}</td>
                  <td className='trunc' title={el.name /*`${el.name} (${el.type})`*/}><span>{el.name}</span></td>
                  <td className='trunc'>
                    {
                      Array.from(el.char).map(char => {
                        return `U+${char.codePointAt() //TODO: show if multiple codepoints
                      .toString(16)
                      .toUpperCase()
                      .padStart(4, '0')}`
                      }).join(', ')
                    }
                  </td>
                  <td dangerouslySetInnerHTML={{__html: 
                    twemoji.parse(el.char, {
                      base: './emoji/',
                      folder: 'twemoji',
                      ext: '.svg'
                    })
                    // el.char
                  }} />
                </tr>)
              })
            }</tbody>
          </table>) : ''}
          </div>
        </form>
        {
          this.state.choices.length
          ? <Pagination
              pageIdx={math.getPageNumber(this.state.rowIdx)}
              totalPages={math.getTotalPages(this.state.choices.length)}
              changePage={(n) => this.setState({
                rowIdx: n === +1
                  ? math.incrementPageNumber(this.state.rowIdx, this.state.choices.length)
                  : math.decrementPageNumber(this.state.rowIdx, this.state.choices.length)
              })}
            />
          : ''
        }
      </div>
    );
  }
}

export default App;

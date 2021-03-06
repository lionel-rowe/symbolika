import React from 'react';
import './App.css';
import config from './config.js';
import math from './math.js';
import Logo from './Logo.js';
import CloseButton from './CloseButton.js';
import Pagination from './Pagination.js';
import twemoji from 'twemoji';
import tabToNext from './tabToNext.js';

const browser = window.chrome || window.browser || {};

const maxSearchLength = 32;

let msgs = {};
let worker = {};

const i14e = (...args) => {
  if (browser.i18n) { //production
    return browser.i18n.getMessage(...args);
  } else { //dev
    const key = args[0];
    return (msgs[key] && msgs[key].message);
  }
}

class App extends React.Component {

  initVals = {
    input: '',
    choices: [],
    rowIdx: 0, //previously: -1
    hoverOffset: 0,
    listenForKeyup: false,
    // elunrLoaded: false //NOTE: should not be in here due to reinit
  };

  state = this.initVals;

  initState = () => this.setState(this.initVals);

  closeWithChar(char) {

    document.querySelector('#searchbox').focus();

    this.initState();
    if (browser.tabs) { //production
      browser.tabs.query({active: true, currentWindow: true}, tabs => {
        browser.tabs.sendMessage(tabs[0].id, {closeWithChar: char});
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

  updateChoices(choices) {

    this.setState({
      elunrLoaded: true,
      rowIdx: this.state.hoverOffset,
      choices: choices
    });

    if (browser.tabs) { //production
      browser.tabs.query({active: true, currentWindow: true}, tabs => {
        browser.tabs.sendMessage(tabs[0].id, {ready: true});
      });
    }

  }

  componentDidMount() {

    worker = new SharedWorker('worker.js');

    worker.port.postMessage({input: this.state.input});

    worker.port.onmessage = e => {
      if (this.state.input === e.data.input) { //prevent change if input has been updated again since message posted
        this.setState({elunrLoaded: true})
        this.updateChoices(e.data.choices);
      }
    }

    browser.runtime && browser.runtime.onMessage && browser.runtime.onMessage.addListener((req, sender) => {
      if (sender.id === browser.runtime.id && req.capturedInput) {
        // initialInput = req.capturedInput;
        this.setState({input: req.capturedInput});
      }
    });

    if (!browser.i18n) {
      fetch('./_locales/en/messages.json', //public
        {cache: 'no-store'}
      ).then(dat => dat.json())
      .then(json => {
        msgs = json;
        this.forceUpdate();
      });
    }

    document.addEventListener('click', e => {
      if (e.target.nodeName === 'HTML' //target is backdrop
        && !this.state.input //avoid deleting user work
      ) {
        this.closeWithChar(null);
      }
    });

    document.addEventListener('wheel', e => {

      if (['ctrlKey', 'shiftKey', 'altKey', 'metaKey'].some(key=> e[key])) return; //must not have modifier keys pressed (don't want to limit other scroll-wheel functionality, such as zooming)

      const rowIdx = this.state.rowIdx;
      const totalRows = this.state.choices.length;
      const offset = this.state.hoverOffset;

      if (e.deltaY < 0) { //upward
        e.preventDefault();
        this.setState({rowIdx: math.decrementPageNumber(rowIdx, totalRows, offset)});
      } else if (e.deltaY > 0) { //downward
        e.preventDefault();
        this.setState({rowIdx: math.incrementPageNumber(rowIdx, totalRows, offset)});
      } else { //catch-all
        e.preventDefault();
      }
    });

    document.addEventListener('keydown', e => {

      const idx = parseInt(e.key, 10) - 1;

      if (['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp'].includes(e.key)) {
        //direction keys

        const rowIdx = this.state.rowIdx;
        const totalRows = this.state.choices.length;
        const offset = this.state.hoverOffset;

        if (e.key === 'ArrowDown') {
          e.preventDefault();
          this.setState({
            rowIdx: math.incrementRowIdx(rowIdx, totalRows),
            hoverOffset: math.getFauxcus(this.state.hoverOffset + 1)
          });
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          this.setState({
            rowIdx: math.decrementRowIdx(rowIdx, totalRows),
            hoverOffset: math.getFauxcus(this.state.hoverOffset - 1)
          });
        } else if (e.key === 'PageDown') {
          e.preventDefault();
          this.setState({rowIdx: math.incrementPageNumber(rowIdx, totalRows, offset)});
        } else if (e.key === 'PageUp') {
          e.preventDefault();
          this.setState({rowIdx: math.decrementPageNumber(rowIdx, totalRows, offset)});
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
      } else if (e.key === 'Tab') {
        e.preventDefault();
        tabToNext(e);
      }

      function msgListener(req, sender, thisArg) {
        if (sender.id === browser.runtime.id && req.reinit) { // reinit
          thisArg.initState();
          document.querySelector('#searchbox').focus();
        }
      }

      browser.runtime && browser.runtime.onMessage && browser.runtime.onMessage.addListener((req, sender) => msgListener(req, sender, this));

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
              const input = e.target.value;

              this.setState({
                input,
                elunrLoaded: this.state.choices.length //show loading message if zero results currently loaded
              });

              worker.port.postMessage({input});

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

                const codePoints = Array.from(el.char).map(char => {
                  return `U+${char.codePointAt()
                .toString(16)
                .toUpperCase()
                .padStart(4, '0')}`
                }).join(', ');

                return (<tr
                  key={idx}

                  onMouseEnter={() => {
                    this.setState({
                      rowIdx: math.getMinDisplayedIdx(this.state.rowIdx) + idx,
                      hoverOffset: idx
                    });
                  }}

                  onClick={() => this.closeWithChar(this.state.choices[this.state.rowIdx].char)}

                  className={math.getFauxcus(this.state.rowIdx) === idx ? 'fauxcused' : null}

                >
                  <td>{idx + 1}</td>
                  <td className='trunc' title={el.name /*`${el.name} (${el.type})`*/}><span>{el.name}</span></td>
                  <td className='trunc' title={codePoints}>
                    {codePoints}
                  </td>
                  <td dangerouslySetInnerHTML={{__html:

                    /*new Array(34).fill(null).map((el, idx) => {
                      return idx === 33 ? 127 : idx;
                    }).includes(el.char.codePointAt()) && el.char.length === 1
                    ? (`<span class='replacementChar'>

                        ${String.fromCodePoint(
                          el.char.codePointAt() === 127
                          ? 9249
                          : el.char.codePointAt() + 9216
                        )}

                    </span>`) //TODO
                    :*/ twemoji.parse(el.char, {
                      base: './emoji/',
                      folder: 'twemoji',
                      ext: '.svg'
                    })
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
                  ? math.incrementPageNumber(this.state.rowIdx, this.state.choices.length, this.state.hoverOffset)
                  : math.decrementPageNumber(this.state.rowIdx, this.state.choices.length, this.state.hoverOffset)
              })}
            />
          : ''
        }
      </div>
    );
  }
}

export default App;

/*global chrome*/

import React, { Component } from 'react';
import './App.css';
import config from './config.js';

const mod = (n1, n2) => ((n1 % n2) + n2) % n2;

const maxSearchLength = 32;
const resultsToDisplay = 9;

let msgs = {};

const i14e = (key) => {
  if (chrome.i18n) { //production
    return chrome.i18n.getMessage(key);
  } else { //dev
    return (msgs[key] && msgs[key].message);
  }
}

let chars = [];

const contentOnly = str => str.replace(/[^a-zA-Z0-9+]|\b(?:and|with)\b/g, '');

let initialInput = '';

class App extends Component {

  initVals = {
    input: initialInput,
    choices: [],
    fauxcused: -1,
    listenForKeyup: false
  };

  state = this.initVals;

  initState = () => this.setState(this.initVals);

  closeWithChar(char) {
    this.initState();
    if (chrome.tabs) { //production
      chrome.tabs.query({active: true, currentWindow: true}, tabs => {
        chrome.tabs.sendMessage(tabs[0].id, {closeWithChar: char});
      });
    } else { //testing
      console.log('Closed with char', char);
    }
  }

  fauxcusStyle = {
    cursor: 'pointer',
    background: '#8f9',
    outline: '1px solid rgba(70, 70, 255, 0.6)'
  };

  setFauxcus(idx, fauxcusState) {
    const fauxcused = fauxcusState ? idx : -1;
    this.setState({fauxcused});
  }

  keyupListener(e, idx) {
    if (+e.key - 1 === idx && this.state.listenForKeyup) {
      this.setFauxcus(idx, false);
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

  componentDidMount() {

    chrome.runtime && chrome.runtime.onMessage && chrome.runtime.onMessage.addListener((req, sender) => {
      if (sender.id === chrome.runtime.id && req.capturedInput) {
        initialInput = req.capturedInput;
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

    fetch('./_locales/en/chars.json', //public
      {cache: 'no-store'}
    ).then(dat => dat.json())
    .then(json => {
      chars = json;
    });

    document.addEventListener('keydown', e => {

      const idx = parseInt(e.key, 10) - 1;

      if (!isNaN(idx) && !e.altKey) { //is a num key (ignore w alt)
        e.preventDefault();
        if (this.isOptionChooser(e) && this.state.choices[idx]) { //is option chooser and option is available
          this.setFauxcus(idx, true);
          this.setState({listenForKeyup: true});
          document.onkeyup = e => this.keyupListener(e, idx);
        } else if (!this.isOptionChooser(e)) { //num key but not option chooser
          document.execCommand('insertText', null, e.key); //replace default behavior
        }
      } else if (e.key === 'ArrowDown' || (e.key === 'Tab' && !e.shiftKey)) {
        e.preventDefault();
        this.setState({fauxcused: mod((this.state.fauxcused + 1), this.state.choices.length)});
      } else if (e.key === 'ArrowUp' || (e.key === 'Tab' && e.shiftKey)) {
        e.preventDefault();
        this.setState({fauxcused: this.state.fauxcused === -1 ? this.state.choices.length - 1 : mod(this.state.fauxcused - 1, this.state.choices.length)});
      } else if (e.key === 'Enter') {
        
        const selected = this.state.fauxcused > -1 ? this.state.fauxcused : 0;  

        if (selected < this.state.choices.length) {
          this.closeWithChar(this.state.choices[selected].char);
        }

      } else if (e.key === 'Escape') {
        if (this.state.input) {
          this.setState({fauxcused: -1, input: '', choices: []});
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
            <span role='img' aria-label=''>🔣</span> {i14e('modal_title')}
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

              this.setState({fauxcused: -1});

              if (!input) {
                this.setState({input: '', choices: []});
                return;
              }

              const inputContentOnly = contentOnly(input);

              const matchList = chars.filter(el => {
                return contentOnly(el.name.toLowerCase())
                  .includes(contentOnly(e.target.value.toLowerCase()));
              });

              const matchedCodepoint = chars.filter(el => {
                const trimmed = e.target.value.trim();
                if (/^[0-9a-f]+$/i.test(trimmed)
                  && el.char.codePointAt() === parseInt(trimmed, 16)) {
                  return el;
                }
              })[0];

              if (matchedCodepoint) { //TODO: fix (add after sorting)
                matchList.unshift(matchedCodepoint);
              }

              matchList.forEach(el => {
                el.codepoint = el.char.codePointAt();
                // el.score = el.name.indexOf(e.target.value);
                el.score = 0;
              });

              const choices = matchList.sort((a, b) => {

                const aPerfect = a.name === input;
                const bPerfect = b.name === input;

                const aPerfectPartial = a.name.slice(0, input.length) === input;
                const bPerfectPartial = b.name.slice(0, input.length) === input;

                const aContentOnly = contentOnly(a.name).slice(0, inputContentOnly.length) === inputContentOnly;
                const bContentOnly = contentOnly(b.name).slice(0, inputContentOnly.length) === inputContentOnly;

                return (bPerfect - aPerfect)
                  || (bPerfectPartial - aPerfectPartial)
                  || (bContentOnly - aContentOnly)
                  || (a.score - b.score)
                  || (a.name.length - b.name.length);

              })
              .filter((el, idx, arr) => {
                return idx < resultsToDisplay * 2 && matchList.filter(m => m.codepoint === el.codepoint).indexOf(el) === 0;
              })
              .filter((el, idx) => idx < resultsToDisplay);

              this.setState({input, choices});

            }}
            maxLength={maxSearchLength}
          />
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
            <tbody>{!this.state.choices.length
              ? (<tr>
                <td colSpan={4}>{i14e('modal_resultsTable_msg_noResults')}</td>
              </tr>)
              : this.state.choices
              .map((el, idx) => {
                return (<tr
                  key={idx}

                  onMouseEnter={() => this.setFauxcus(idx, true)}
                  onMouseLeave={() => this.setFauxcus(idx, false)}

                  onFocus={() => this.setFauxcus(idx, true)}
                  onBlur={() => this.setFauxcus(idx, false)}

                  onClick={() => this.closeWithChar(this.state.choices[this.state.fauxcused].char)}

                  style={this.state.fauxcused === idx ? this.fauxcusStyle : {outline: 'none'}}
                >
                  <td>{idx + 1}</td>
                  <td className='trunc' title={`${el.name} (${el.type})`}><span>{el.name}</span></td>
                  <td>U+{
                    el.codepoint
                      .toString(16)
                      .toUpperCase()
                      .padStart(4, '0')
                  }</td>
                  <td>{el.char}</td>
                </tr>)
              })
            }</tbody>
          </table>) : ''}

        </form>
      </div>
    );
  }
}


export default App;


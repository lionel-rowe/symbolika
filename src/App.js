/*global chrome*/

import React, { Component } from 'react';
import './App.css';
import config from './config.js';
// import Fuse from "fuse.js"
import entities from './data/html_entities.js';
import emoji from './data/emoji.js';
import unicode from './data/unicode_chars.js';
import aliases from './data/aliases.js';

const mod = (n, m) => ((n % m) + m) % m;

const maxSearchLength = 32;
const resultsToDisplay = 9;

const contentOnly = str => str.replace(/[^a-zA-Z0-9+]|\b(?:and|with)\b/g, '');

const chars = entities.map(el => ({char: el.char, name: el.name, type: 'html'}))
.concat(emoji.map(el => ({char: el.char, name: el.name, type: 'emoji'})))
.concat(unicode.map(el => ({char: el.char, name: el.name.toLowerCase(), type: 'unicode'})))
.concat(aliases.map(el => ({char: el.char, name: el.name, type: 'alias'})));

// const options = {
//   keys: ['name'],
//   caseSensitive: false,
//   shouldSort: false,
//   includeScore: true,
//   // tokenize: true,
//   location: 0,
//   threshold: 0,
//   maxPatternLength: maxSearchLength,
//   distance: 100
// };

// const fuse = new Fuse(chars, options);

class App extends Component {

  initVals = {
    input: '',
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

      function reinitListener(req, sender, thisArg) {
        if (sender.id === chrome.runtime.id && req.reinit) {
          thisArg.initState();
          document.querySelector('#searchbox').focus();
        }
      }

      chrome.runtime && chrome.runtime.onMessage && chrome.runtime.onMessage.addListener((req, sender) => reinitListener(req, sender, this));

    });

    document.querySelector('#searchbox').focus();

  }

  render() {


    return (
      <div className='modal'>
        <header>
          <h1>
            <span role='img' aria-label=''>🔣</span> Insert Special Character
          </h1>
        </header>
        <form
          onSubmit={e => {
            e.preventDefault();
          }}
        >
          <input
            type='search'
            placeholder='Search'
            autoComplete='off'
            id='searchbox'
            value={this.state.input}
            onChange={e => {
              const input = e.target.value;

              this.setState({fauxcused: -1});

              // const matchList = fuse.search(e.target.value)
              //   .map(el => {
              //     return {name: el.item.name, char: el.item.char, type: el.item.type, codepoint: el.item.char.codePointAt(), score: el.score};
              //   });

              if (!input) {
                this.setState({input: '', choices: []});
                return;
              }

              const inputContentOnly = contentOnly(input);

              const matchList = chars.filter(el => {
                return contentOnly(el.name.toLowerCase())
                  .includes(contentOnly(e.target.value.toLowerCase()));
              }).map(el => {
                el.codepoint = el.char.codePointAt();
                // el.score = el.name.indexOf(e.target.value);
                el.score = 0;
                return el;
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
                <th style={{width: '4em'}}>№</th>
                <th style={{width: '18em'}}>Name</th>
                <th>Codepoint</th>
                <th>Character</th>
              </tr>
            </thead>
            <tbody>{!this.state.choices.length
              ? (<tr>
                <td colSpan={4}>No results found</td>
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
